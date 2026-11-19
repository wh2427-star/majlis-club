import { describe, expect, it } from "vitest";
import { profileChecklist, viewsTrend, weekChange } from "@/lib/domain/dashboard";

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

describe("viewsTrend", () => {
  it("never says 'no change' when views rose from zero", () => {
    expect(viewsTrend(12, 0)).toEqual({ kind: "fromZero" });
  });
  it("says no change only when nothing changed", () => {
    expect(viewsTrend(0, 0)).toEqual({ kind: "none" });
    expect(viewsTrend(5, 5)).toEqual({ kind: "none" });
  });
  it("gives a signed percentage otherwise", () => {
    expect(viewsTrend(94, 82)).toEqual({ kind: "percent", value: 15 });
    expect(viewsTrend(0, 4)).toEqual({ kind: "percent", value: -100 });
  });
});
