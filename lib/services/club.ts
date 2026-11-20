import "server-only";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClubById, getCurrentUser, getMyClubs } from "@/lib/data/queries";
import { basicsSchema, fieldErrors, licenceSchema, photoSchema, scheduleFieldKey, scheduleSchema } from "@/lib/schemas";
import { licenceState, shouldShowUpgradePrompt } from "@/lib/domain/rules";
import { viewsTrend } from "@/lib/domain/dashboard";
import { appConfig } from "@/config/app";
import { isValidUploadPath, uploadRules, type UploadKind } from "@/lib/domain/uploads";
import { requireUser } from "./family";
import type { ActionState } from "./public-actions";

/** The browser uploads the file to storage first; check the path belongs to this club and the object exists. */
async function checkStoredUpload(kind: UploadKind, clubId: string, path: string) {
  if (!isValidUploadPath(kind, clubId, path)) return false;
  const db = await createClient();
  const { data } = await db.storage.from(uploadRules[kind].bucket).exists(path);
  return data === true;
}

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

function readBasics(form: FormData) {
  return basicsSchema.safeParse({
    name: form.get("name"),
    sportId: form.get("sportId"),
    areaId: form.get("areaId"),
    clubType: form.get("clubType"),
    ageGroups: form.getAll("ageGroups"),
    description: form.get("description") ?? "",
    coachCredentials: form.get("coachCredentials") ?? "",
    typicalReplyDays: form.get("typicalReplyDays") ?? 3,
  });
}

/** Listing step 1 for a new club. New clubs start pending; an admin approves them. Sessions come in step 2. */
export async function createClub(form: FormData): Promise<ActionState & { id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "errors.signInRequired" };
  const parsed = readBasics(form);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const b = parsed.data;
  const db = await createClient();
  const { data: area } = await db.from("areas").select("lat, lng").eq("id", b.areaId).single();
  if (!area) return { ok: false, errors: { areaId: "errors.area" } };
  const id = randomUUID();
  const { error } = await db.from("clubs").insert({
    id,
    slug: slugify(b.name),
    name: b.name,
    club_type: b.clubType,
    area_id: b.areaId,
    primary_sport_id: b.sportId,
    age_groups: b.ageGroups,
    description: b.description,
    coach_credentials: b.coachCredentials,
    typical_reply_days: b.typicalReplyDays,
    // Until a club sets its own location, it sits at its area's centre point.
    lat: area.lat,
    lng: area.lng,
    created_by: user.id,
  });
  if (error) return { ok: false, message: "errors.generic" };
  const { error: e2 } = await db.from("club_sports").insert({ club_id: id, sport_id: b.sportId });
  if (e2) return { ok: false, message: "errors.generic" };
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

/** Listing step 1 for an existing club. */
export async function updateBasics(clubId: string, form: FormData): Promise<ActionState> {
  await requireClubAccess(clubId, `/club/${clubId}/edit`);
  const parsed = readBasics(form);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const b = parsed.data;
  const db = await createClient();
  const { error } = await db
    .from("clubs")
    .update({
      name: b.name, club_type: b.clubType, area_id: b.areaId, primary_sport_id: b.sportId, age_groups: b.ageGroups,
      description: b.description, coach_credentials: b.coachCredentials, typical_reply_days: b.typicalReplyDays,
    })
    .eq("id", clubId);
  if (error) return { ok: false, message: "errors.generic" };
  // A club's sports are its session sports plus its main sport; a replaced main sport does not linger.
  const { data: rows } = await db.from("club_sessions").select("sport_id").eq("club_id", clubId);
  const sportIds = [...new Set([...(rows ?? []).map((r) => r.sport_id as string), b.sportId])];
  const del = await db.from("club_sports").delete().eq("club_id", clubId);
  const ins = await db.from("club_sports").insert(sportIds.map((sport_id) => ({ club_id: clubId, sport_id })));
  if (del.error || ins.error) return { ok: false, message: "errors.generic" };
  return { ok: true, message: "editor.savedChanges" };
}

/**
 * Listing step 2: replace the club's venues, groups, times and prices in one transaction.
 * Groups with no times and no prices, and venues left with no groups, are dropped.
 * The club's sports are its session sports plus its main sport.
 */
export async function updateSchedule(clubId: string, form: FormData): Promise<ActionState> {
  const { club } = await requireClubAccess(clubId, `/club/${clubId}/edit/schedule`);
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("schedule") ?? "{}"));
  } catch {
    return { ok: false, errors: { schedule: "errors.invalid" } };
  }
  const parsed = scheduleSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = scheduleFieldKey(issue.path);
      const msg = issue.message.startsWith("errors.") ? issue.message : "errors.invalid";
      if (!errors[key]) errors[key] = msg;
      if (!errors.schedule) errors.schedule = msg;
    }
    return { ok: false, errors };
  }
  const venues = parsed.data.venues
    .map((v) => ({ ...v, groups: v.groups.filter((g) => g.sessions.length || g.plans.length) }))
    .filter((v) => v.groups.length);
  const db = await createClient();
  const { error } = await db.rpc("save_club_schedule", { p_club: clubId, p_payload: { venues, plans: parsed.data.plans } });
  if (error) return { ok: false, message: "errors.generic" };
  const sessionSports = venues.flatMap((v) => v.groups.flatMap((g) => g.sessions.map((s) => s.sportId)));
  const sportIds = [...new Set([...sessionSports, ...(club.primarySportId ? [club.primarySportId] : [])])];
  const del = await db.from("club_sports").delete().eq("club_id", clubId);
  const ins = sportIds.length ? await db.from("club_sports").insert(sportIds.map((sport_id) => ({ club_id: clubId, sport_id }))) : { error: null };
  if (del.error || ins.error) return { ok: false, message: "errors.generic" };
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
  const path = String(form.get("path") ?? "");
  if (!(await checkStoredUpload("photo", parsed.data.clubId, path))) return { ok: false, errors: { file: "errors.file" } };
  const db = await createClient();
  const { error } = await db.from("club_photos").insert({
    club_id: parsed.data.clubId,
    storage_path: path,
    alt_text: parsed.data.altText,
    caption: parsed.data.caption || null,
    consent_confirmed_at: new Date().toISOString(),
    uploaded_by: user.id,
  });
  if (error) return { ok: false, message: "errors.generic" };
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
  const path = String(form.get("path") ?? "");
  if (!(await checkStoredUpload("licence", parsed.data.clubId, path))) return { ok: false, errors: { document: "errors.file" } };
  const db = await createClient();
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

export type EnquiryRow = {
  id: string; contact_name: string; contact_email: string; contact_phone: string | null; child_nickname: string | null;
  child_birth_year: number | null; message: string; status: "sent" | "seen" | "replied" | "closed"; created_at: string;
};

/** Club dashboard: six weeks of real counts, honest even when small. Upgrade prompt only when 30-day enquiries cross the threshold. */
export async function getDashboard(clubId: string) {
  const db = await createClient();
  const now = new Date();
  const d42 = new Date(now.getTime() - 42 * 864e5).toISOString();
  const d30 = new Date(now.getTime() - 30 * 864e5).toISOString();
  const enquiryCount = async (from: string) => {
    const { count } = await db.from("club_events").select("id", { count: "exact", head: true }).eq("club_id", clubId).eq("kind", "enquiry").gte("created_at", from);
    return count ?? 0;
  };
  const [weekly, saves, enquiriesTotal, enquiries30, list] = await Promise.all([
    // Counted in SQL: reading rows would be capped by the API's max rows and undercount busy clubs.
    db.rpc("club_weekly_views", { p_club: clubId }),
    db.rpc("club_save_count", { p_club: clubId }),
    enquiryCount(d42),
    enquiryCount(d30),
    db
      .from("enquiries")
      .select("id, contact_name, contact_email, contact_phone, child_nickname, child_birth_year, message, status, created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const weeks = (weekly.data as number[] | null) ?? [0, 0, 0, 0, 0, 0];
  return {
    weeks,
    viewsTotal: weeks.reduce((a, b) => a + b, 0),
    viewsTrend: viewsTrend(weeks[5], weeks[4]),
    saves: (saves.data as number | null) ?? 0,
    enquiriesTotal,
    enquiries30,
    showUpgrade: shouldShowUpgradePrompt(enquiries30, appConfig.upgradeEnquiryThreshold),
    list: (list.data ?? []) as EnquiryRow[],
  };
}

export async function setEnquiryStatus(clubId: string, enquiryId: string, status: "seen" | "replied" | "closed") {
  await requireClubAccess(clubId, `/club/${clubId}`);
  const db = await createClient();
  await db.from("enquiries").update({ status }).eq("id", enquiryId).eq("club_id", clubId);
}
