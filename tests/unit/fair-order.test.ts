import { describe, expect, it } from "vitest";
import { rankClubs } from "@/lib/domain/search";
import type { ClubSummary } from "@/lib/domain/types";

const origin = { lat: 25.053, lng: 55.269, areaId: "ranches" };

function club(i: number, overrides: Partial<ClubSummary> = {}): ClubSummary {
  return {
    id: `club-${String(i).padStart(2, "0")}`,
    slug: `club-${i}`,
    name: `Club ${String.fromCharCode(65 + (i * 7) % 26)}${i}`,
    clubType: i % 2 ? "academy" : "community",
    areaId: "ranches",
    areaName: "Arabian Ranches",
    lat: 25.053 + ((i * 37) % 11) * 0.004,
    lng: 55.269 + ((i * 13) % 7) * 0.004,
    description: "",
    sports: ["football"],
    sessions: [
      { id: `s${i}`, sportSlug: i % 3 ? "football" : "swimming", day: i % 7, start: "16:30", end: "17:30", ageMin: 5, ageMax: 12, priceAed: 50 + i * 5 },
    ],
    licenceVerified: i % 4 === 0,
    trialOffer: i % 5 === 0,
    featuredAreaIds: [],
    photoCount: i % 3,
    ...overrides,
  };
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ids = (r: { organic: { id: string }[] }) => r.organic.map((c) => c.id);

describe("fair order (product rule 1)", () => {
  const base = Array.from({ length: 24 }, (_, i) => club(i));

  it("organic order is identical with and without any featured club", () => {
    const without = rankClubs(base, origin);
    expect(without.featured).toEqual([]);
    for (let k = 0; k < base.length; k++) {
      const withFeatured = base.map((c, i) => (i === k ? { ...c, featuredAreaIds: ["ranches"] } : c));
      const result = rankClubs(withFeatured, origin);
      expect(ids(result)).toEqual(ids(without));
      expect(result.featured.map((c) => c.id)).toEqual([base[k].id]);
    }
  });

  it("organic order is identical when every club is featured", () => {
    const all = base.map((c) => ({ ...c, featuredAreaIds: ["ranches"] }));
    expect(ids(rankClubs(all, origin))).toEqual(ids(rankClubs(base, origin)));
  });

  it("organic order is sorted by distance, then name, and nothing else", () => {
    const r = rankClubs(base, origin).organic;
    for (let i = 1; i < r.length; i++) {
      const a = r[i - 1];
      const b = r[i];
      expect(a.distanceKm <= b.distanceKm).toBe(true);
      if (a.distanceKm === b.distanceKm) expect(a.name.localeCompare(b.name, "en", { sensitivity: "base" }) <= 0).toBe(true);
    }
  });

  it("does not depend on input order", () => {
    const expected = ids(rankClubs(base, origin));
    for (let seed = 1; seed < 20; seed++) expect(ids(rankClubs(shuffle(base, seed), origin))).toEqual(expected);
  });

  it("badges, photos and club type never change the order (rules 2 and 6)", () => {
    const expected = ids(rankClubs(base, origin));
    const flipped = base.map((c) => ({
      ...c,
      clubType: (c.clubType === "academy" ? "community" : "academy") as ClubSummary["clubType"],
      licenceVerified: !c.licenceVerified,
      trialOffer: !c.trialOffer,
      photoCount: 10 - c.photoCount,
      description: "Award-winning ".repeat(10),
    }));
    expect(ids(rankClubs(flipped, origin))).toEqual(expected);
  });

  it("a featured club that does not match the filters is not shown in the featured slot", () => {
    const withFeatured = base.map((c, i) => (i === 0 ? { ...c, featuredAreaIds: ["ranches"] } : c));
    // club 0 runs swimming (0 % 3 === 0); filter to football
    const r = rankClubs(withFeatured, origin, { sport: "football" });
    expect(r.featured).toEqual([]);
    expect(r.organic.find((c) => c.id === base[0].id)).toBeUndefined();
  });

  it("featured only applies to the area it was bought for", () => {
    const withFeatured = base.map((c, i) => (i === 1 ? { ...c, featuredAreaIds: ["springs"] } : c));
    expect(rankClubs(withFeatured, origin).featured).toEqual([]);
  });
});

describe("filters", () => {
  const base = Array.from({ length: 12 }, (_, i) => club(i));
  it("filters by child age, day, price and distance", () => {
    const r = rankClubs(base, origin, { childAge: 13 });
    expect(r.organic).toEqual([]);
    const byDay = rankClubs(base, origin, { day: 2 }).organic;
    expect(byDay.every((c) => c.matchingSessions.every((s) => s.day === 2))).toBe(true);
    const cheap = rankClubs(base, origin, { maxPriceAed: 60 }).organic;
    expect(cheap.every((c) => c.matchingSessions.every((s) => s.priceAed <= 60))).toBe(true);
    const near = rankClubs(base, origin, { maxDistanceKm: 1 }).organic;
    expect(near.every((c) => c.distanceKm <= 1)).toBe(true);
  });
});
