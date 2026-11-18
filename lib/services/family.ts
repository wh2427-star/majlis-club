import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClubById, getCurrentUser, getPublicClubs } from "@/lib/data/queries";
import { childSchema, enquirySchema, fieldErrors } from "@/lib/schemas";
import { ageFromBirthYear } from "@/lib/domain/facts";
import { buildWeek } from "@/lib/domain/schedule";
import type { ActionState } from "./public-actions";

export async function requireUser(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}

export type Child = { id: string; nickname: string; birthYear: number; age: number };

export async function getChildren(): Promise<Child[]> {
  const db = await createClient();
  const { data, error } = await db.from("children").select("id, nickname, birth_year").order("birth_year");
  if (error) throw error;
  return data.map((c) => ({ id: c.id, nickname: c.nickname, birthYear: c.birth_year, age: ageFromBirthYear(c.birth_year) }));
}

export async function getParentContact() {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await createClient();
  const { data } = await db.from("parents").select("display_name, phone").eq("user_id", user.id).maybeSingle();
  return { name: data?.display_name ?? user.displayName, email: user.email, phone: data?.phone ?? "" };
}

export async function sendEnquiry(form: FormData): Promise<ActionState & { id?: string }> {
  const parsed = enquirySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "errors.signInRequired" };
  const d = parsed.data;
  const club = await getClubById(d.clubId);
  if (!club || club.status !== "approved") return { ok: false, message: "errors.generic" };

  const db = await createClient();
  let child: { nickname: string; birth_year: number } | null = null;
  if (d.childId) {
    const { data } = await db.from("children").select("nickname, birth_year").eq("id", d.childId).maybeSingle();
    child = data;
  }
  const { data, error } = await db
    .from("enquiries")
    .insert({
      parent_id: user.id,
      club_id: club.id,
      child_id: d.childId || null,
      contact_name: d.contactName,
      contact_email: d.contactEmail,
      contact_phone: d.contactPhone || null,
      child_nickname: child?.nickname ?? null,
      child_birth_year: child?.birth_year ?? null,
      sport_id: d.sportId || null,
      message: d.message ?? "",
      contact_consent_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: "errors.generic" };
  // Keep the parent's contact details for next time (pre-fill).
  await db.from("parents").update({ display_name: d.contactName, phone: d.contactPhone || null }).eq("user_id", user.id);
  return { ok: true, id: data.id };
}

export async function getEnquiry(id: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("enquiries")
    .select("id, club_id, contact_name, contact_email, contact_phone, child_nickname, child_birth_year, message, status, created_at, sports(slug)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as
    | (Omit<NonNullable<typeof data>, "sports"> & { sports: { slug: string } | null })
    | null;
}

export async function getFamily() {
  const db = await createClient();
  const [children, saved, enquiries, clubs] = await Promise.all([
    getChildren(),
    db.from("saved_clubs").select("club_id").order("created_at"),
    db.from("enquiries").select("id, club_id, status, created_at").order("created_at", { ascending: false }),
    getPublicClubs(),
  ]);
  if (saved.error) throw saved.error;
  if (enquiries.error) throw enquiries.error;
  const byId = new Map(clubs.map((c) => [c.id, c]));
  const savedClubs = saved.data.map((s) => byId.get(s.club_id)).filter((c): c is NonNullable<typeof c> => !!c);
  const week = buildWeek(
    savedClubs.map((c) => ({ clubId: c.id, clubName: c.name, sessions: c.sessions })),
    children.map((c) => c.age),
  );
  return {
    children,
    savedClubs,
    enquiries: enquiries.data.map((e) => ({ ...e, clubName: byId.get(e.club_id)?.name ?? "", clubSlug: byId.get(e.club_id)?.slug ?? "" })),
    week,
  };
}

export async function addChild(form: FormData): Promise<ActionState> {
  const parsed = childSchema.safeParse({ nickname: form.get("nickname"), birthYear: form.get("birthYear") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "errors.signInRequired" };
  const db = await createClient();
  const { error } = await db.from("children").insert({ parent_id: user.id, nickname: parsed.data.nickname, birth_year: parsed.data.birthYear });
  if (error) return { ok: false, message: "errors.generic" };
  return { ok: true };
}

export async function removeChild(id: string) {
  const db = await createClient();
  await db.from("children").delete().eq("id", id);
}
