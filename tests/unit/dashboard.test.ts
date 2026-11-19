import { describe, expect, it } from "vitest";
import { profileChecklist, weekChange, weeklyCounts } from "@/lib/domain/dashboard";

const now = new Date("2026-11-19T12:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * 864e5).toISOString();

describe("weeklyCounts", () => {
  it("buckets timestamps into six weeks, oldest first, ignoring older ones", () => {
    expect(weeklyCounts([ago(1), ago(8), ago(41), ago(43)], now)).toEqual([1, 0, 0, 0, 1, 1]);
  });
  it("gives six zeros for no views", () => {
    expect(weeklyCounts([], now)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("weekChange", () => {
  it("rounds the percentage change", () => {
    expect(weekChange(94, 82)).toBe(15);
    expect(weekChange(82, 94)).toBe(-13);
  });
  it("is null when last week had nothing", () => {
    expect(weekChange(5, 0)).toBeNull();
    expect(weekChange(0, 0)).toBeNull();
  });
});

describe("profileChecklist", () => {
  const blank = { description: "", coachCredentials: "", ageGroups: [], photoCount: 0, licenceVerified: false, sessionCount: 0 };
  it("lists six undone items in order for a blank club", () => {
    expect(profileChecklist(blank)).toEqual(
      ["description", "coachCredentials", "ageGroups", "photos", "licence", "schedule"].map((key) => ({ key, done: false })),
    );
  });
  it("counts a description as done from 40 characters", () => {
    expect(profileChecklist({ ...blank, description: "x".repeat(39) })[0].done).toBe(false);
    expect(profileChecklist({ ...blank, description: "x".repeat(40) })[0].done).toBe(true);
  });
});
