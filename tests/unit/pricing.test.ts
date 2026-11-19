import { describe, expect, it } from "vitest";
import { cardPrice, perSessionEquivalent, withinMaxPrice, type PlanKind, type PricePlan } from "@/lib/domain/pricing";

const plan = (kind: PlanKind, priceAed: number, sessionsCount: number | null = null): PricePlan => ({ kind, priceAed, sessionsCount, label: "" });

describe("pricing", () => {
  it("per-session equivalents", () => {
    expect(perSessionEquivalent(plan("per_session", 85))).toBe(85);
    expect(perSessionEquivalent(plan("per_term", 900, 12))).toBe(75);
    expect(perSessionEquivalent(plan("block", 500, 6))).toBeCloseTo(83.333, 2);
    expect(perSessionEquivalent(plan("per_year", 3000))).toBeNull();
  });
  it("card price is the lowest equivalent, rounded up", () => {
    expect(cardPrice([plan("per_session", 85), plan("block", 500, 6)])).toEqual({ kind: "perSession", aed: 84 });
    expect(cardPrice([plan("per_year", 3000), plan("per_year", 2500)])).toEqual({ kind: "perYear", aed: 2500 });
    expect(cardPrice([plan("per_year", 3000), plan("per_term", 600, 10)])).toEqual({ kind: "perSession", aed: 60 });
    expect(cardPrice([])).toBeNull();
  });
  it("price filter uses equivalents and drops clubs without one", () => {
    expect(withinMaxPrice([plan("per_session", 85), plan("per_term", 600, 10)], 60)).toBe(true);
    expect(withinMaxPrice([plan("per_session", 85)], 60)).toBe(false);
    expect(withinMaxPrice([plan("per_year", 100)], 60)).toBe(false);
    expect(withinMaxPrice([], 60)).toBe(false);
  });
});
