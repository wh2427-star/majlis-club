/**
 * Zod schemas shared by client forms and server actions.
 * Error messages are i18n keys (resolved in the UI), never English text.
 */
import { z } from "zod";

const currentYear = new Date().getFullYear();
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "errors.time");
const trimmed = (min: number, max: number, key: string) =>
  z.string().trim().min(min, key).max(max, key);

export const searchParamsSchema = z.object({
  area: z.string().min(1).optional(),
  sport: z.string().optional(),
  age: z.coerce.number().int().min(2).max(18).optional(),
  day: z.coerce.number().int().min(0).max(6).optional(),
  maxPrice: z.coerce.number().min(0).max(5000).optional(),
  maxKm: z.coerce.number().min(0).max(100).optional(),
});
export type SearchParams = z.infer<typeof searchParamsSchema>;

export const waitlistSchema = z.object({
  areaId: z.string().uuid(),
  email: z.string().trim().email("errors.email").max(254),
});

export const suggestionSchema = z.object({
  areaId: z.string().uuid().optional(),
  clubName: trimmed(2, 80, "errors.clubName"),
  note: z.string().trim().max(500).optional(),
});

export const childSchema = z.object({
  nickname: trimmed(1, 30, "errors.nickname"),
  birthYear: z.coerce.number().int().min(currentYear - 18, "errors.birthYear").max(currentYear - 2, "errors.birthYear"),
});

export const enquirySchema = z.object({
  clubId: z.string().uuid(),
  contactName: trimmed(1, 80, "errors.name"),
  contactEmail: z.string().trim().email("errors.email").max(254),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  childId: z.string().uuid().optional().or(z.literal("")),
  sportId: z.string().uuid().optional().or(z.literal("")),
  message: z.string().trim().max(1000, "errors.message").optional().default(""),
  consent: z.literal("on", { message: "errors.consent" }),
});

export const ageGroupValues = ["3-5", "6-8", "9-12", "13+"] as const;

/** Listing step 1. Age groups are labels for parents; they never affect search. */
export const basicsSchema = z.object({
  name: trimmed(2, 80, "errors.clubName"),
  sportId: z.string().uuid("errors.sport"),
  areaId: z.string().uuid("errors.area"),
  clubType: z.enum(["academy", "community"], { message: "errors.clubType" }),
  ageGroups: z.array(z.enum(ageGroupValues, { message: "errors.ageGroups" })).min(1, "errors.ageGroups"),
  description: z.string().trim().max(1500, "errors.description").default(""),
  coachCredentials: z.string().trim().max(200, "errors.coachCredentials").default(""),
  typicalReplyDays: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 3 : v),
    z.coerce.number({ message: "errors.replyDays" }).int("errors.replyDays").min(1, "errors.replyDays").max(14, "errors.replyDays"),
  ),
});

export const photoSchema = z.object({
  clubId: z.string().uuid(),
  altText: trimmed(3, 200, "errors.altText"),
  caption: z.string().trim().max(140, "errors.caption").optional().default(""),
  consent: z.literal("on", { message: "errors.photoConsent" }),
});

export const licenceSchema = z.object({
  clubId: z.string().uuid(),
  number: trimmed(1, 60, "errors.licenceNumber"),
  issuingAuthority: trimmed(1, 120, "errors.authority"),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "errors.date"),
});

export const photoReportSchema = z.object({
  photoId: z.string().uuid(),
  reason: z.enum(["child_named_in_caption", "no_consent", "inappropriate", "other"]),
  note: z.string().trim().max(500).optional().default(""),
});

export const signUpSchema = z.object({
  email: z.string().trim().email("errors.email"),
  password: z.string().min(8, "errors.password"),
  displayName: trimmed(1, 80, "errors.name"),
  role: z.enum(["parent", "club"]).default("parent"),
});

export const signInSchema = z.object({
  email: z.string().trim().email("errors.email"),
  password: z.string().min(1, "errors.password"),
});

export const magicLinkSchema = z.object({ email: z.string().trim().email("errors.email") });

/** Flatten Zod issues to { field: i18nKey } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message.startsWith("errors.") ? issue.message : "errors.invalid";
  }
  return out;
}

export const planKinds = ["per_session", "per_term", "per_year", "block"] as const;

/** One price plan. Terms need a session count; blocks are 5 to 10 sessions; the others take no count. */
export const pricePlanSchema = z
  .object({
    kind: z.enum(planKinds, { message: "errors.planKind" }),
    priceAed: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.coerce.number({ message: "errors.price" }).min(0, "errors.price").max(100000, "errors.price"),
    ),
    sessionsCount: z.preprocess((v) => (v === "" || v === undefined ? null : v), z.coerce.number().int().nullable()),
    label: z.string().trim().max(40, "errors.planLabel").default(""),
  })
  .superRefine((p, ctx) => {
    const n = p.sessionsCount;
    if (p.kind === "per_term" && (n == null || n < 1 || n > 100))
      ctx.addIssue({ code: "custom", message: "errors.termSessions", path: ["sessionsCount"] });
    if (p.kind === "block" && (n == null || n < 5 || n > 10))
      ctx.addIssue({ code: "custom", message: "errors.blockSessions", path: ["sessionsCount"] });
  })
  .transform((p) => ({ ...p, sessionsCount: p.kind === "per_session" || p.kind === "per_year" ? null : p.sessionsCount }));

/** Local calendar date as yyyy-mm-dd, offset by whole days. */
export function isoDay(offsetDays = 0, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A parent asks for a free trial. The child is either a saved child or typed in. */
export const trialRequestSchema = z
  .object({
    clubId: z.string().uuid(),
    sessionId: z.string().uuid("errors.trialSession"),
    childId: z.string().uuid().optional().or(z.literal("")),
    childNickname: z.string().trim().max(30, "errors.nickname").optional(),
    childBirthYear: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(2000, "errors.birthYear").max(2100, "errors.birthYear").optional()),
    preferredDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "errors.trialDate")
      .refine((d) => d >= isoDay(0) && d <= isoDay(60), "errors.trialDate"),
    contactName: trimmed(1, 80, "errors.name"),
    contactEmail: z.string().trim().email("errors.email").max(254),
    consent: z.literal("on", { message: "errors.consent" }),
  })
  .refine((r) => !!r.childId || (!!r.childNickname && r.childBirthYear != null), { message: "errors.child", path: ["childNickname"] });

/** A session time within a group; the group holds the ages. */
export const groupSessionSchema = z
  .object({
    sportId: z.string().uuid("errors.sport"),
    day: z.coerce.number().int().min(0).max(6),
    start: time,
    end: time,
    trialAvailable: z.boolean().default(false),
  })
  .refine((s) => s.end > s.start, { message: "errors.endAfterStart", path: ["end"] });

export const groupSchema = z
  .object({
    name: z.string().trim().max(60, "errors.groupName").default(""),
    ageMin: z.coerce.number().int().min(2, "errors.age").max(18, "errors.age"),
    ageMax: z.coerce.number().int().min(2, "errors.age").max(18, "errors.age"),
    sessions: z.array(groupSessionSchema).max(14, "errors.tooManySessions"),
    plans: z.array(pricePlanSchema).max(8, "errors.tooManyPlans"),
  })
  .refine((g) => g.ageMax >= g.ageMin, { message: "errors.ageRange", path: ["ageMax"] });

export const venueSchema = z.object({
  name: trimmed(1, 80, "errors.venueName"),
  areaId: z.string().uuid("errors.area"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  groups: z.array(groupSchema).max(10, "errors.tooManyGroups"),
});

/** Listing step 2: venues, their groups (ages, times, prices) and the club-wide prices. */
export const scheduleSchema = z.object({
  venues: z.array(venueSchema).max(5, "errors.tooManyVenues"),
  plans: z.array(pricePlanSchema).max(8, "errors.tooManyPlans"),
});
export type ScheduleInput = z.infer<typeof scheduleSchema>;

const pathPrefix: Record<string, string> = { venues: "v", groups: "g", sessions: "s", plans: "p" };

/** Zod issue path → editor field key: ["venues", 1, "groups", 0, "plans", 2, "sessionsCount"] → "v1-g0-p2-sessionsCount". */
export function scheduleFieldKey(path: PropertyKey[]): string {
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const seg = String(path[i]);
    const next = path[i + 1];
    if (pathPrefix[seg] && typeof next === "number") {
      parts.push(`${pathPrefix[seg]}${next}`);
      i++;
    } else parts.push(seg);
  }
  return parts.join("-") || "schedule";
}
