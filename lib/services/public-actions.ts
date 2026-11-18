import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, photoReportSchema, suggestionSchema, waitlistSchema } from "@/lib/schemas";

export type ActionState = { ok: boolean; errors?: Record<string, string>; message?: string };

export async function joinWaitlist(form: FormData): Promise<ActionState> {
  const parsed = waitlistSchema.safeParse({ areaId: form.get("areaId"), email: form.get("email") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const db = await createClient();
  const { error } = await db.from("waitlist").insert({ area_id: parsed.data.areaId, email: parsed.data.email });
  // A repeat sign-up (unique violation) is still a success for the parent.
  if (error && error.code !== "23505") return { ok: false, message: "errors.generic" };
  return { ok: true };
}

export async function suggestClub(form: FormData): Promise<ActionState> {
  const parsed = suggestionSchema.safeParse({
    areaId: form.get("areaId") || undefined,
    clubName: form.get("clubName"),
    note: form.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const db = await createClient();
  const { error } = await db
    .from("club_suggestions")
    .insert({ area_id: parsed.data.areaId ?? null, club_name: parsed.data.clubName, note: parsed.data.note ?? null });
  if (error) return { ok: false, message: "errors.generic" };
  return { ok: true };
}

export async function reportPhoto(form: FormData): Promise<ActionState> {
  const parsed = photoReportSchema.safeParse({ photoId: form.get("photoId"), reason: form.get("reason"), note: form.get("note") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const db = await createClient();
  const { data: user } = await db.auth.getUser();
  if (!user.user) return { ok: false, message: "errors.signInRequired" };
  const { error } = await db.from("photo_reports").insert({
    photo_id: parsed.data.photoId,
    reporter_id: user.user.id,
    reason: parsed.data.reason,
    note: parsed.data.note || null,
  });
  if (error) return { ok: false, message: "errors.generic" };
  return { ok: true };
}

export async function setSaved(clubId: string, saved: boolean): Promise<ActionState> {
  const db = await createClient();
  const { data: user } = await db.auth.getUser();
  if (!user.user) return { ok: false, message: "errors.signInRequired" };
  const { error } = saved
    ? await db.from("saved_clubs").upsert({ parent_id: user.user.id, club_id: clubId })
    : await db.from("saved_clubs").delete().eq("parent_id", user.user.id).eq("club_id", clubId);
  if (error) return { ok: false, message: "errors.generic" };
  return { ok: true };
}

export async function isSaved(clubId: string): Promise<boolean> {
  const db = await createClient();
  const { data: user } = await db.auth.getUser();
  if (!user.user) return false;
  const { data } = await db.from("saved_clubs").select("club_id").eq("club_id", clubId).eq("parent_id", user.user.id).maybeSingle();
  return !!data;
}

export async function recordView(clubId: string) {
  const db = await createClient();
  await db.rpc("record_club_view", { p_club: clubId });
}
