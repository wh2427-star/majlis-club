import "server-only";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClubById, getCurrentUser, getMyClubs } from "@/lib/data/queries";
import { clubListingSchema, fieldErrors, licenceSchema, photoSchema, sessionSchema } from "@/lib/schemas";
import { licenceState, shouldShowUpgradePrompt } from "@/lib/domain/rules";
import { appConfig } from "@/config/app";
import { requireUser } from "./family";
import type { ActionState } from "./public-actions";

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const LICENCE_TYPES: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };

/** The signed-in user must manage this club (or be an admin). */
export async function requireClubAccess(clubId: string, next: string) {
  const user = await requireUser(next);
  const mine = await getMyClubs();
  if (user.role !== "admin" && !mine.some((c) => c.id === clubId)) notFound();
  const club = await getClubById(clubId);
  if (!club) notFound();
  return { user, club };
}

function slugify(name: string) {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "club";
  return `${base}-${randomUUID().slice(0, 6)}`;
}

/** Create a listing with its first session. New clubs start pending; an admin approves them. */
export async function createClub(form: FormData): Promise<ActionState & { id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "errors.signInRequired" };
  const listing = clubListingSchema.safeParse({
    name: form.get("name"),
    clubType: form.get("clubType"),
    areaId: form.get("areaId"),
    description: "",
    typicalReplyDays: 3,
  });
  const session = sessionSchema.safeParse({
    sportId: form.get("sportId"),
    day: form.get("day"),
    start: form.get("start"),
    end: form.get("end"),
    ageMin: form.get("ageMin"),
    ageMax: form.get("ageMax"),
    priceAed: form.get("priceAed"),
  });
  if (!listing.success || !session.success) {
    return {
      ok: false,
      errors: { ...(listing.success ? {} : fieldErrors(listing.error)), ...(session.success ? {} : fieldErrors(session.error)) },
    };
  }
  const db = await createClient();
  const { data: area } = await db.from("areas").select("lat, lng").eq("id", listing.data.areaId).single();
  if (!area) return { ok: false, errors: { areaId: "errors.area" } };
  const id = randomUUID();
  const { error } = await db.from("clubs").insert({
    id,
    slug: slugify(listing.data.name),
    name: listing.data.name,
    club_type: listing.data.clubType,
    area_id: listing.data.areaId,
    // Until a club sets its own location, it sits at its area's centre point.
    lat: area.lat,
    lng: area.lng,
    created_by: user.id,
  });
  if (error) return { ok: false, message: "errors.generic" };
  const s = session.data;
  const [a, b] = await Promise.all([
    db.from("club_sports").insert({ club_id: id, sport_id: s.sportId }),
    db.from("club_sessions").insert({
      club_id: id, sport_id: s.sportId, day: s.day, start_time: s.start, end_time: s.end,
      age_min: s.ageMin, age_max: s.ageMax, price_aed: s.priceAed,
    }),
  ]);
  if (a.error || b.error) return { ok: false, message: "errors.generic" };
  return { ok: true, id };
}

export async function searchClaimable(q: string) {
  const term = q.trim();
  if (term.length < 2) return [];
  const db = await createClient();
  const { data } = await db
    .from("clubs")
    .select("id, name, slug, areas(name)")
    .eq("status", "approved")
    .ilike("name", `%${term.replace(/[%_]/g, "")}%`)
    .limit(8);
  return (data ?? []) as unknown as { id: string; name: string; slug: string; areas: { name: string } | null }[];
}

export async function claimClub(form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "errors.signInRequired" };
  const clubId = String(form.get("clubId") ?? "");
  const db = await createClient();
  const { error } = await db.from("club_claims").insert({ club_id: clubId, user_id: user.id, note: String(form.get("note") ?? "") || null });
  if (error && error.code !== "23505") return { ok: false, message: "errors.generic" };
  return { ok: true };
}

/** Save the listing editor: details and the full list of sessions. */
export async function updateListing(clubId: string, form: FormData): Promise<ActionState> {
  await requireClubAccess(clubId, `/club/${clubId}/edit`);
  const listing = clubListingSchema.safeParse({
    name: form.get("name"),
    clubType: form.get("clubType"),
    areaId: form.get("areaId"),
    description: form.get("description") ?? "",
    typicalReplyDays: form.get("typicalReplyDays"),
  });
  if (!listing.success) return { ok: false, errors: fieldErrors(listing.error) };
  let rawSessions: unknown[] = [];
  try {
    rawSessions = JSON.parse(String(form.get("sessions") ?? "[]"));
  } catch {
    return { ok: false, errors: { sessions: "errors.invalid" } };
  }
  const sessions = [];
  for (const [i, raw] of rawSessions.entries()) {
    const parsed = sessionSchema.safeParse(raw);
    if (!parsed.success) {
      const [field, key] = Object.entries(fieldErrors(parsed.error))[0];
      return { ok: false, errors: { [`session-${i}-${field}`]: key, sessions: key } };
    }
    sessions.push(parsed.data);
  }
  const db = await createClient();
  const l = listing.data;
  const { error } = await db
    .from("clubs")
    .update({ name: l.name, club_type: l.clubType, area_id: l.areaId, description: l.description, typical_reply_days: l.typicalReplyDays })
    .eq("id", clubId);
  if (error) return { ok: false, message: "errors.generic" };
  await db.from("club_sessions").delete().eq("club_id", clubId);
  if (sessions.length) {
    const { error: e2 } = await db.from("club_sessions").insert(
      sessions.map((s) => ({
        club_id: clubId, sport_id: s.sportId, day: s.day, start_time: s.start, end_time: s.end,
        age_min: s.ageMin, age_max: s.ageMax, price_aed: s.priceAed,
      })),
    );
    if (e2) return { ok: false, message: "errors.generic" };
  }
  await db.from("club_sports").delete().eq("club_id", clubId);
  const sportIds = [...new Set(sessions.map((s) => s.sportId))];
  if (sportIds.length) await db.from("club_sports").insert(sportIds.map((sport_id) => ({ club_id: clubId, sport_id })));
  return { ok: true, message: "editor.savedChanges" };
}

export async function uploadPhoto(form: FormData): Promise<ActionState> {
  const parsed = photoSchema.safeParse({
    clubId: form.get("clubId"),
    altText: form.get("altText"),
    caption: form.get("caption") ?? "",
    consent: form.get("consent"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { user } = await requireClubAccess(parsed.data.clubId, `/club/${parsed.data.clubId}/photos`);
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, errors: { file: "errors.file" } };
  const ext = PHOTO_TYPES[file.type];
  if (!ext || file.size > 5 * 1024 * 1024) return { ok: false, errors: { file: "errors.fileType" } };
  const db = await createClient();
  const path = `${parsed.data.clubId}/${randomUUID()}.${ext}`;
  const up = await db.storage.from("club-photos").upload(path, file, { contentType: file.type });
  if (up.error) return { ok: false, message: "errors.generic" };
  const { error } = await db.from("club_photos").insert({
    club_id: parsed.data.clubId,
    storage_path: path,
    alt_text: parsed.data.altText,
    caption: parsed.data.caption || null,
    consent_confirmed_at: new Date().toISOString(),
    uploaded_by: user.id,
  });
  if (error) {
    await db.storage.from("club-photos").remove([path]);
    return { ok: false, message: "errors.generic" };
  }
  return { ok: true, message: "photos.uploaded" };
}

export async function deletePhoto(clubId: string, photoId: string) {
  await requireClubAccess(clubId, `/club/${clubId}/photos`);
  const db = await createClient();
  const { data } = await db.from("club_photos").select("storage_path").eq("id", photoId).eq("club_id", clubId).maybeSingle();
  if (!data) return;
  await db.from("club_photos").delete().eq("id", photoId);
  await db.storage.from("club-photos").remove([data.storage_path]);
}

export async function submitLicence(form: FormData): Promise<ActionState> {
  const parsed = licenceSchema.safeParse({
    clubId: form.get("clubId"),
    number: form.get("number"),
    issuingAuthority: form.get("issuingAuthority"),
    expiresOn: form.get("expiresOn"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  await requireClubAccess(parsed.data.clubId, `/club/${parsed.data.clubId}/licence`);
  const file = form.get("document");
  if (!(file instanceof File) || file.size === 0) return { ok: false, errors: { document: "errors.file" } };
  const ext = LICENCE_TYPES[file.type];
  if (!ext || file.size > 10 * 1024 * 1024) return { ok: false, errors: { document: "errors.fileType" } };
  const db = await createClient();
  const path = `${parsed.data.clubId}/${randomUUID()}.${ext}`;
  const up = await db.storage.from("licences").upload(path, file, { contentType: file.type });
  if (up.error) return { ok: false, message: "errors.generic" };
  const { error } = await db.from("licences").insert({
    club_id: parsed.data.clubId,
    number: parsed.data.number,
    issuing_authority: parsed.data.issuingAuthority,
    expires_on: parsed.data.expiresOn,
    document_path: path,
  });
  if (error) return { ok: false, message: "errors.generic" };
  return { ok: true, message: "licence.submitted" };
}

export async function getLicenceStatus(clubId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("licences")
    .select("status, expires_on, created_at, reject_reason")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data.map((l) => ({ status: l.status, expiresOn: l.expires_on, createdAt: l.created_at, rejectReason: l.reject_reason }));
  const state = licenceState(rows);
  const verified = rows.filter((r) => r.status === "approved").sort((a, b) => b.expiresOn.localeCompare(a.expiresOn))[0];
  return { state, verifiedUntil: verified?.expiresOn, rejectReason: rows[0]?.rejectReason ?? "" };
}

/** Demand view: plain counts, honest even when small. Upgrade prompt only when enquiries cross the threshold. */
export async function getDemand(clubId: string) {
  const db = await createClient();
  const now = Date.now();
  const d30 = new Date(now - 30 * 864e5).toISOString();
  const d60 = new Date(now - 60 * 864e5).toISOString();
  const count = async (kind: "view" | "enquiry", from: string, to?: string) => {
    let q = db.from("club_events").select("id", { count: "exact", head: true }).eq("club_id", clubId).eq("kind", kind).gte("created_at", from);
    if (to) q = q.lt("created_at", to);
    const { count: c } = await q;
    return c ?? 0;
  };
  const [views, enquiries, prevViews, prevEnquiries, list] = await Promise.all([
    count("view", d30),
    count("enquiry", d30),
    count("view", d60, d30),
    count("enquiry", d60, d30),
    db
      .from("enquiries")
      .select("id, contact_name, contact_email, contact_phone, child_nickname, child_birth_year, message, status, created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  return {
    views,
    enquiries,
    prevViews,
    prevEnquiries,
    list: list.data ?? [],
    showUpgrade: shouldShowUpgradePrompt(enquiries, appConfig.upgradeEnquiryThreshold),
  };
}

export async function setEnquiryStatus(clubId: string, enquiryId: string, status: "seen" | "replied" | "closed") {
  await requireClubAccess(clubId, `/club/${clubId}/demand`);
  const db = await createClient();
  await db.from("enquiries").update({ status }).eq("id", enquiryId).eq("club_id", clubId);
}
