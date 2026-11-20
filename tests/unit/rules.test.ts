import { describe, expect, it } from "vitest";
import { captionNameWarning, coverage, isLicenceVerified, licenceState, shouldShowUpgradePrompt } from "@/lib/domain/rules";
import { formatTime12, summariseSessions } from "@/lib/domain/facts";
import { buildWeek } from "@/lib/domain/schedule";
import { haversineKm } from "@/lib/domain/distance";
import { basicsSchema, pricePlanSchema, scheduleFieldKey, scheduleSchema, trialRequestSchema } from "@/lib/schemas";

describe("licence badge (rule 8)", () => {
  const today = "2026-11-18";
  it("appears only after approval", () => {
    expect(isLicenceVerified([{ status: "pending", expiresOn: "2027-01-01" }], today)).toBe(false);
    expect(isLicenceVerified([{ status: "approved", expiresOn: "2027-01-01" }], today)).toBe(true);
  });
  it("disappears on expiry", () => {
    expect(isLicenceVerified([{ status: "approved", expiresOn: "2026-11-17" }], today)).toBe(false);
    expect(isLicenceVerified([{ status: "approved", expiresOn: today }], today)).toBe(true);
  });
  it("reports state for the club", () => {
    expect(licenceState([], today)).toBe("none");
    expect(licenceState([{ status: "approved", expiresOn: "2026-01-01", createdAt: "2025-01-01" }], today)).toBe("expired");
    expect(licenceState([{ status: "rejected", expiresOn: "2027-01-01", createdAt: "2026-01-01" }], today)).toBe("rejected");
  });
});

describe("coverage rule", () => {
  it("needs 25% of identified clubs listed", () => {
    expect(coverage(24, 110)).toMatchObject({ needed: 28, thresholdMet: false });
    expect(coverage(28, 110).thresholdMet).toBe(true);
    expect(coverage(0, 0).thresholdMet).toBe(false);
  });
});

describe("upgrade prompt", () => {
  it("is triggered by demand only", () => {
    expect(shouldShowUpgradePrompt(9, 10)).toBe(false);
    expect(shouldShowUpgradePrompt(10, 10)).toBe(true);
    expect(shouldShowUpgradePrompt(0, 0)).toBe(false);
  });
});

describe("caption names hint (rule 7)", () => {
  it("flags likely names but not places, days or sports words", () => {
    expect(captionNameWarning("Saturday training at the Springs")).toEqual([]);
    expect(captionNameWarning("Great save by Layla in the U10 Cup")).toEqual(["Layla"]);
    expect(captionNameWarning("Team photo", ["Desert Falcons"])).toEqual([]);
  });
});

describe("facts", () => {
  it("formats times as in the voice examples", () => {
    expect(formatTime12("16:30:00")).toBe("4:30pm");
    expect(formatTime12("09:00")).toBe("9:00am");
    expect(formatTime12("12:15")).toBe("12:15pm");
  });
  it("summarises sessions into ages and days", () => {
    const f = summariseSessions([
      { id: "a", sportSlug: "swimming", day: 2, start: "16:30", end: "17:30", ageMin: 6, ageMax: 12, venueId: "v", groupId: "g", trialAvailable: false },
      { id: "b", sportSlug: "swimming", day: 0, start: "16:30", end: "17:30", ageMin: 6, ageMax: 10, venueId: "v", groupId: "g", trialAvailable: false },
    ])!;
    expect(f).toMatchObject({ ageMin: 6, ageMax: 12 });
    expect(f).not.toHaveProperty("priceMinAed");
    expect(f.schedule.map((d) => d.day)).toEqual([0, 2]);
  });
});

describe("weekly view", () => {
  it("lays saved sessions out by day and time", () => {
    const week = buildWeek([
      { clubId: "c1", clubName: "B club", sessions: [{ id: "1", sportSlug: "tennis", day: 1, start: "17:00", end: "18:00", ageMin: 6, ageMax: 9, venueId: "v", groupId: "g", trialAvailable: false }] },
      { clubId: "c2", clubName: "A club", sessions: [{ id: "2", sportSlug: "football", day: 1, start: "16:00", end: "17:00", ageMin: 10, ageMax: 14, venueId: "v", groupId: "g", trialAvailable: false }] },
    ]);
    expect(week[1].map((e) => e.clubId)).toEqual(["c2", "c1"]);
    expect(buildWeek([{ clubId: "c1", clubName: "x", sessions: [{ id: "1", sportSlug: "t", day: 1, start: "17:00", end: "18:00", ageMin: 6, ageMax: 9, venueId: "v", groupId: "g", trialAvailable: false }] }], [12])[1]).toEqual([]);
  });
});

describe("distance", () => {
  it("matches a known distance within 1%", () => {
    // Arabian Ranches centre to the Springs centre is roughly 8.8 km
    const d = haversineKm({ lat: 25.053, lng: 55.269 }, { lat: 25.056, lng: 55.182 });
    expect(d).toBeGreaterThan(8.6);
    expect(d).toBeLessThan(8.9);
  });
});

describe("basics schema (listing step 1)", () => {
  const ok = {
    name: "Springs Rovers Junior FC",
    sportId: "8f14e45f-ceea-4e7a-9b1c-2d3e4f5a6b7c",
    areaId: "1c4ca423-8a1e-4b2c-9d3e-5f6a7b8c9d0e",
    clubType: "academy",
    ageGroups: ["6-8", "9-12"],
    description: "",
    coachCredentials: "",
  };
  it("accepts the listed age groups", () => {
    expect(basicsSchema.safeParse(ok).success).toBe(true);
  });
  it("needs at least one age group", () => {
    expect(basicsSchema.safeParse({ ...ok, ageGroups: [] }).success).toBe(false);
  });
  it("rejects an age group that is not offered", () => {
    expect(basicsSchema.safeParse({ ...ok, ageGroups: ["14-16"] }).success).toBe(false);
  });
  it("treats an empty reply-days field as the default of 3", () => {
    const r = basicsSchema.safeParse({ ...ok, typicalReplyDays: "" });
    expect(r.success && r.data.typicalReplyDays).toBe(3);
  });
  it("explains a reply-days value out of range", () => {
    const r = basicsSchema.safeParse({ ...ok, typicalReplyDays: "15" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("errors.replyDays");
  });
  it("caps coach credentials at 200 characters", () => {
    expect(basicsSchema.safeParse({ ...ok, coachCredentials: "x".repeat(201) }).success).toBe(false);
  });
});

describe("pricePlanSchema", () => {
  const err = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues[0]?.message;
  it("a term needs at least one session", () => {
    expect(err(pricePlanSchema.safeParse({ kind: "per_term", priceAed: 900, sessionsCount: 0 }))).toBe("errors.termSessions");
    expect(pricePlanSchema.safeParse({ kind: "per_term", priceAed: 900, sessionsCount: 12 }).success).toBe(true);
  });
  it("a block is 5 to 10 sessions", () => {
    for (const n of [4, 11]) expect(err(pricePlanSchema.safeParse({ kind: "block", priceAed: 500, sessionsCount: n }))).toBe("errors.blockSessions");
    for (const n of [5, 10]) expect(pricePlanSchema.safeParse({ kind: "block", priceAed: 500, sessionsCount: n }).success).toBe(true);
  });
  it("per-session and yearly plans drop any count", () => {
    for (const kind of ["per_session", "per_year"]) {
      const r = pricePlanSchema.safeParse({ kind, priceAed: 85, sessionsCount: 7 });
      expect(r.success && r.data.sessionsCount).toBeNull();
    }
  });
  it("limits label and price", () => {
    expect(err(pricePlanSchema.safeParse({ kind: "per_session", priceAed: 85, label: "x".repeat(41) }))).toBe("errors.planLabel");
    for (const p of [-1, 100001]) expect(err(pricePlanSchema.safeParse({ kind: "per_session", priceAed: p }))).toBe("errors.price");
  });
});

describe("trialRequestSchema", () => {
  const ymd = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const base = {
    clubId: "11111111-1111-4111-8111-111111111111", sessionId: "22222222-2222-4222-8222-222222222222",
    childId: "33333333-3333-4333-8333-333333333333", preferredDate: ymd(0), contactName: "Sam", contactEmail: "sam@example.com", consent: "on",
  };
  const err = (v: object) => trialRequestSchema.safeParse(v).error?.issues[0]?.message;
  it("date is today to 60 days ahead", () => {
    expect(err({ ...base, preferredDate: ymd(-1) })).toBe("errors.trialDate");
    expect(trialRequestSchema.safeParse(base).success).toBe(true);
    expect(err({ ...base, preferredDate: ymd(61) })).toBe("errors.trialDate");
  });
  it("needs a child", () => {
    expect(err({ ...base, childId: "" })).toBe("errors.child");
    expect(trialRequestSchema.safeParse({ ...base, childId: "", childNickname: "Zara", childBirthYear: 2017 }).success).toBe(true);
  });
  it("needs consent", () => {
    expect(err({ ...base, consent: undefined })).toBe("errors.consent");
  });
});

describe("scheduleSchema", () => {
  const uuid = "11111111-1111-4111-8111-111111111111";
  const venue = (groups: object[]) => ({ name: "Hall", areaId: uuid, lat: 25, lng: 55, groups });
  const group = (plans: object[] = []) => ({ name: "", ageMin: 6, ageMax: 8, sessions: [{ sportId: uuid, day: 0, start: "16:30", end: "17:30" }], plans });
  it("keys an error by its place in the editor", () => {
    const r = scheduleSchema.safeParse({ plans: [], venues: [venue([group()]), venue([group([{ kind: "block", priceAed: 1, sessionsCount: 12 }])])] });
    expect(r.success).toBe(false);
    const issue = r.error!.issues[0];
    expect(issue.message).toBe("errors.blockSessions");
    expect(scheduleFieldKey(issue.path)).toBe("v1-g0-p0-sessionsCount");
  });
  it("caps venues at 5", () => {
    const r = scheduleSchema.safeParse({ plans: [], venues: Array.from({ length: 6 }, () => venue([])) });
    expect(r.error?.issues[0].message).toBe("errors.tooManyVenues");
  });
  it("accepts a valid schedule", () => {
    expect(scheduleSchema.safeParse({ plans: [{ kind: "per_session", priceAed: 50 }], venues: [venue([group()])] }).success).toBe(true);
  });
});
