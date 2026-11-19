import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ClubSummary, Session } from "@/lib/domain/types";

export type Area = { id: string; slug: string; name: string; lat: number; lng: number; status: "live" | "coming_soon"; clusterId: string };
export type Sport = { id: string; slug: string; name: string };

export const getAreas = cache(async (): Promise<Area[]> => {
  const db = await createClient();
  const { data, error } = await db.from("areas").select("id, slug, name, lat, lng, status, cluster_id").order("sort");
  if (error) throw error;
  return data.map((a) => ({ id: a.id, slug: a.slug, name: a.name, lat: a.lat, lng: a.lng, status: a.status, clusterId: a.cluster_id }));
});

export const getSports = cache(async (): Promise<Sport[]> => {
  const db = await createClient();
  const { data, error } = await db.from("sports").select("id, slug, name").order("sort");
  if (error) throw error;
  return data;
});

type ClubRow = {
  id: string; slug: string; name: string; club_type: "academy" | "community"; area_id: string; lat: number; lng: number;
  description: string; typical_reply_days: number; status: string;
  coach_credentials: string; age_groups: string[]; primary_sport_id: string | null;
  areas: { name: string } | null;
  club_sessions: { id: string; day: number; start_time: string; end_time: string; age_min: number; age_max: number; price_aed: number; sports: { slug: string } | null }[];
  club_sports: { sports: { slug: string } | null }[];
  club_photos: { id: string }[];
};

const CLUB_SELECT =
  "id, slug, name, club_type, area_id, lat, lng, description, typical_reply_days, status, coach_credentials, age_groups, primary_sport_id, areas(name), club_sessions(id, day, start_time, end_time, age_min, age_max, price_aed, sports(slug)), club_sports(sports(slug)), club_photos(id)";

function toSession(s: ClubRow["club_sessions"][number]): Session {
  return {
    id: s.id,
    sportSlug: s.sports?.slug ?? "",
    day: s.day,
    start: s.start_time.slice(0, 5),
    end: s.end_time.slice(0, 5),
    ageMin: s.age_min,
    ageMax: s.age_max,
    priceAed: Number(s.price_aed),
  };
}

type Badges = { licence_verified: boolean; trial_offer: boolean; featured_area_ids: string[] };

export function toSummary(row: ClubRow, badges?: Badges): ClubSummary & { typicalReplyDays: number; status: string; coachCredentials: string; ageGroups: string[]; primarySportId: string | null } {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    clubType: row.club_type,
    areaId: row.area_id,
    areaName: row.areas?.name ?? "",
    lat: row.lat,
    lng: row.lng,
    description: row.description,
    sports: row.club_sports.map((s) => s.sports?.slug ?? "").filter(Boolean),
    sessions: row.club_sessions.map(toSession).sort((a, b) => a.day - b.day || a.start.localeCompare(b.start)),
    licenceVerified: badges?.licence_verified ?? false,
    trialOffer: badges?.trial_offer ?? false,
    featuredAreaIds: badges?.featured_area_ids ?? [],
    photoCount: row.club_photos.length,
    typicalReplyDays: row.typical_reply_days,
    status: row.status,
    coachCredentials: row.coach_credentials ?? "",
    ageGroups: row.age_groups ?? [],
    primarySportId: row.primary_sport_id ?? null,
  };
}

const getBadges = cache(async (): Promise<Map<string, Badges>> => {
  const db = await createClient();
  const { data, error } = await db.rpc("club_badges");
  if (error) throw error;
  return new Map((data as (Badges & { club_id: string })[]).map((b) => [b.club_id, b]));
});

/** All publicly listed clubs (RLS returns approved clubs to the public). */
export const getPublicClubs = cache(async () => {
  const db = await createClient();
  const { data, error } = await db.from("clubs").select(CLUB_SELECT).eq("status", "approved");
  if (error) throw error;
  const badges = await getBadges();
  return (data as unknown as ClubRow[]).map((r) => toSummary(r, badges.get(r.id)));
});

export async function getClubBySlug(slug: string) {
  const db = await createClient();
  const { data, error } = await db.from("clubs").select(CLUB_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const badges = await getBadges();
  return toSummary(data as unknown as ClubRow, badges.get((data as unknown as ClubRow).id));
}

export async function getClubById(id: string) {
  const db = await createClient();
  const { data, error } = await db.from("clubs").select(CLUB_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const badges = await getBadges();
  return toSummary(data as unknown as ClubRow, badges.get(id));
}

export type ClubPhoto = { id: string; url: string; altText: string; caption: string | null; status: string };

/** Photos the current viewer may see, with short-lived signed URLs. */
export async function getClubPhotos(clubId: string): Promise<ClubPhoto[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("club_photos")
    .select("id, storage_path, alt_text, caption, status")
    .eq("club_id", clubId)
    .order("sort");
  if (error) throw error;
  if (!data.length) return [];
  const { data: signed } = await db.storage.from("club-photos").createSignedUrls(data.map((p) => p.storage_path), 3600);
  return data.map((p, i) => ({ id: p.id, url: signed?.[i]?.signedUrl ?? "", altText: p.alt_text, caption: p.caption, status: p.status }));
}

export type CurrentUser = { id: string; email: string; role: "parent" | "club" | "admin"; displayName: string };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return null;
  const [{ data: profile }, { data: parent }] = await Promise.all([
    db.from("profiles").select("role").eq("user_id", data.user.id).maybeSingle(),
    db.from("parents").select("display_name").eq("user_id", data.user.id).maybeSingle(),
  ]);
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    role: (profile?.role as CurrentUser["role"]) ?? "parent",
    displayName: parent?.display_name ?? "",
  };
});

export async function getMyClubs() {
  const user = await getCurrentUser();
  if (!user) return [];
  const db = await createClient();
  const { data, error } = await db.from("club_members").select("club_id, role, clubs(id, slug, name, status)").eq("user_id", user.id);
  if (error) throw error;
  return (data as unknown as { club_id: string; role: string; clubs: { id: string; slug: string; name: string; status: string } }[]).map((m) => m.clubs);
}
