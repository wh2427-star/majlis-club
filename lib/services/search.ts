import "server-only";
import { getAreas, getPublicClubs } from "@/lib/data/queries";
import { rankClubs, type SearchFilters } from "@/lib/domain/search";
import { searchParamsSchema } from "@/lib/schemas";

export type SearchOutcome =
  | { kind: "no-area" }
  | { kind: "coming-soon"; areaSlug: string }
  | {
      kind: "results";
      area: { id: string; slug: string; name: string };
      filters: SearchFilters;
      sport?: string;
      result: ReturnType<typeof rankClubs>;
      /** When nothing matches: nearest listed clubs without filters, so the page is never an empty list. */
      nearby: ReturnType<typeof rankClubs>["organic"];
    };

export async function searchClubs(raw: Record<string, string | string[] | undefined>): Promise<SearchOutcome> {
  const flat = Object.fromEntries(
    Object.entries(raw)
      .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
      .filter(([, v]) => v !== undefined && v !== ""),
  );
  const parsed = searchParamsSchema.safeParse(flat);
  const params = parsed.success ? parsed.data : {};
  const areas = await getAreas();
  const area = areas.find((a) => a.slug === params.area);
  if (!area) return { kind: "no-area" };
  if (area.status !== "live") return { kind: "coming-soon", areaSlug: area.slug };

  const filters: SearchFilters = {
    sport: params.sport,
    childAge: params.age,
    day: params.day,
    maxPriceAed: params.maxPrice,
    maxDistanceKm: params.maxKm,
  };
  const clubs = await getPublicClubs();
  const origin = { lat: area.lat, lng: area.lng, areaId: area.id };
  const result = rankClubs(clubs, origin, filters);
  const nearby = result.organic.length === 0 ? rankClubs(clubs, origin, {}).organic.slice(0, 3) : [];
  return { kind: "results", area: { id: area.id, slug: area.slug, name: area.name }, filters, sport: params.sport, result, nearby };
}
