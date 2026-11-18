/**
 * Search and ranking. Product rules enforced here:
 *  1. Fair order: organic results are ordered by distance from the chosen area, then by name,
 *     and by nothing else. Paid placement never changes the organic order.
 *  2. Featured clubs render in a separate, labelled slot. They also stay in the organic list
 *     at their organic position.
 *  6. Club type (academy or community) never affects ranking.
 */
import { haversineKm, roundedKm } from "./distance";
import type { ClubSummary, Point, Session } from "./types";

export type SearchFilters = {
  sport?: string;
  childAge?: number;
  day?: number;
  maxPriceAed?: number;
  maxDistanceKm?: number;
};

export type RankedClub = ClubSummary & {
  distanceKm: number;
  /** Sessions that match the filters (all sessions when no session filter applies). */
  matchingSessions: Session[];
};

export type SearchResult = {
  organic: RankedClub[];
  featured: RankedClub[];
};

function sessionMatches(s: Session, f: SearchFilters): boolean {
  if (f.sport && s.sportSlug !== f.sport) return false;
  if (f.childAge != null && (f.childAge < s.ageMin || f.childAge > s.ageMax)) return false;
  if (f.day != null && s.day !== f.day) return false;
  if (f.maxPriceAed != null && s.priceAed > f.maxPriceAed) return false;
  return true;
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/** The only ordering used for organic results: distance, then name. */
export function compareOrganic(a: RankedClub, b: RankedClub): number {
  if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
  const byName = collator.compare(a.name, b.name);
  return byName !== 0 ? byName : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function rankClubs(
  clubs: ClubSummary[],
  origin: Point & { areaId: string },
  filters: SearchFilters = {},
): SearchResult {
  const sessionFilterActive =
    filters.sport != null || filters.childAge != null || filters.day != null || filters.maxPriceAed != null;

  const matched: RankedClub[] = [];
  for (const club of clubs) {
    const distanceKm = roundedKm(haversineKm(origin, club));
    if (filters.maxDistanceKm != null && distanceKm > filters.maxDistanceKm) continue;
    const matchingSessions = club.sessions.filter((s) => sessionMatches(s, filters));
    if (sessionFilterActive && matchingSessions.length === 0) continue;
    matched.push({ ...club, distanceKm, matchingSessions: sessionFilterActive ? matchingSessions : club.sessions });
  }

  const organic = [...matched].sort(compareOrganic);
  // Featured slot: only clubs that already match the parent's search, featured for this area.
  const featured = organic.filter((c) => c.featuredAreaIds.includes(origin.areaId)).slice(0, 1);
  return { organic, featured };
}
