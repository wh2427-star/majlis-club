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

export const sessionSchema = z
  .object({
    sportId: z.string().uuid("errors.sport"),
    day: z.coerce.number().int().min(0).max(6),
    start: time,
    end: time,
    ageMin: z.coerce.number().int().min(2, "errors.age").max(18, "errors.age"),
    ageMax: z.coerce.number().int().min(2, "errors.age").max(18, "errors.age"),
    priceAed: z.coerce.number().min(0, "errors.price").max(5000, "errors.price"),
  })
  .refine((s) => s.end > s.start, { message: "errors.endAfterStart", path: ["end"] })
  .refine((s) => s.ageMax >= s.ageMin, { message: "errors.ageRange", path: ["ageMax"] });

export const clubListingSchema = z.object({
  name: trimmed(2, 80, "errors.clubName"),
  clubType: z.enum(["academy", "community"], { message: "errors.clubType" }),
  areaId: z.string().uuid("errors.area"),
  description: z.string().trim().max(1500, "errors.description").default(""),
  typicalReplyDays: z.coerce.number().int().min(1).max(14).default(3),
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
