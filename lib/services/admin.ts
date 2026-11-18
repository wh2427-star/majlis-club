import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./family";
import { coverage } from "@/lib/domain/rules";
import { appConfig } from "@/config/app";

export async function requireAdmin(next: string) {
  const user = await requireUser(next);
  if (user.role !== "admin") notFound();
  return user;
}

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const reason = z.string().trim().min(1).max(500);

export async function counts() {
  await requireAdmin("/admin");
  const db = await createClient();
  const c = async (table: string, col: string, val: string) => {
    const { count } = await db.from(table).select("*", { count: "exact", head: true }).eq(col, val);
    return count ?? 0;
  };
  const [licences, reports, clubs, claims] = await Promise.all([
    c("licences", "status", "pending"),
    c("photo_reports", "status", "open"),
    c("clubs", "status", "pending"),
    c("club_claims", "status", "pending"),
  ]);
  return { licences, reports, approvals: clubs + claims };
}

// Licences ----------------------------------------------------------------

export async function licenceQueue() {
  await requireAdmin("/admin/licences");
  const db = await createClient();
  const { data, error } = await db
    .from("licences")
    .select("id, number, issuing_authority, expires_on, document_path, created_at, clubs(name, club_type)")
    .eq("status", "pending")
    .order("created_at");
  if (error) throw error;
  const rows = data as unknown as {
    id: string; number: string; issuing_authority: string; expires_on: string; document_path: string | null; created_at: string;
    clubs: { name: string; club_type: string } | null;
  }[];
  const paths = rows.map((r) => r.document_path).filter((p): p is string => !!p);
  const { data: signed } = paths.length ? await db.storage.from("licences").createSignedUrls(paths, 600) : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({ ...r, documentUrl: r.document_path ? urlFor.get(r.document_path) ?? null : null }));
}

export async function approveLicence(id: string, expiresOn: string) {
  const user = await requireAdmin("/admin/licences");
  const db = await createClient();
  await db
    .from("licences")
    .update({ status: "approved", expires_on: date.parse(expiresOn), reviewed_by: user.id, reviewed_at: new Date().toISOString(), reject_reason: null })
    .eq("id", uuid.parse(id));
}

export async function rejectLicence(id: string, why: string) {
  const user = await requireAdmin("/admin/licences");
  const db = await createClient();
  await db
    .from("licences")
    .update({ status: "rejected", reject_reason: reason.parse(why), reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", uuid.parse(id));
}

// Reported photos ----------------------------------------------------------

export async function reportQueue() {
  await requireAdmin("/admin/photos");
  const db = await createClient();
  const { data, error } = await db
    .from("photo_reports")
    .select("id, reason, note, created_at, club_photos(id, storage_path, alt_text, caption, status, clubs(name))")
    .eq("status", "open")
    .order("created_at");
  if (error) throw error;
  const rows = data as unknown as {
    id: string; reason: string; note: string | null; created_at: string;
    club_photos: { id: string; storage_path: string; alt_text: string; caption: string | null; status: string; clubs: { name: string } | null } | null;
  }[];
  const paths = rows.map((r) => r.club_photos?.storage_path).filter((p): p is string => !!p);
  const { data: signed } = paths.length ? await db.storage.from("club-photos").createSignedUrls(paths, 600) : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({ ...r, photoUrl: r.club_photos ? urlFor.get(r.club_photos.storage_path) ?? null : null }));
}

/** Uphold: the photo is removed. Dismiss: the photo is shown again. */
export async function resolveReport(reportId: string, outcome: "upheld" | "dismissed") {
  await requireAdmin("/admin/photos");
  const db = await createClient();
  const { data: report } = await db.from("photo_reports").select("photo_id").eq("id", uuid.parse(reportId)).single();
  if (!report) return;
  await db.from("club_photos").update({ status: outcome === "upheld" ? "removed" : "visible" }).eq("id", report.photo_id);
  // Resolve every open report on this photo together.
  await db
    .from("photo_reports")
    .update({ status: outcome, resolved_at: new Date().toISOString() })
    .eq("photo_id", report.photo_id)
    .eq("status", "open");
}

// New clubs and claims -----------------------------------------------------

export async function approvalQueue() {
  await requireAdmin("/admin/approvals");
  const db = await createClient();
  const [clubs, claims] = await Promise.all([
    db.from("clubs").select("id, slug, name, club_type, created_at, areas(name)").eq("status", "pending").order("created_at"),
    db.from("club_claims").select("id, club_id, user_id, note, created_at, clubs(name)").eq("status", "pending").order("created_at"),
  ]);
  if (clubs.error) throw clubs.error;
  if (claims.error) throw claims.error;
  return {
    clubs: clubs.data as unknown as { id: string; slug: string; name: string; club_type: string; created_at: string; areas: { name: string } | null }[],
    claims: claims.data as unknown as { id: string; club_id: string; user_id: string; note: string | null; created_at: string; clubs: { name: string } | null }[],
  };
}

export async function decideClub(id: string, approve: boolean, why?: string) {
  await requireAdmin("/admin/approvals");
  const db = await createClient();
  await db
    .from("clubs")
    .update(approve ? { status: "approved", reject_reason: null } : { status: "rejected", reject_reason: reason.parse(why) })
    .eq("id", uuid.parse(id));
}

export async function decideClaim(id: string, approve: boolean) {
  await requireAdmin("/admin/approvals");
  const db = await createClient();
  const { data: claim } = await db.from("club_claims").select("club_id, user_id").eq("id", uuid.parse(id)).single();
  if (!claim) return;
  if (approve) await db.from("club_members").upsert({ club_id: claim.club_id, user_id: claim.user_id, role: "owner" });
  await db
    .from("club_claims")
    .update({ status: approve ? "approved" : "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id);
}

// Coverage ------------------------------------------------------------------

export async function coverageDashboard() {
  await requireAdmin("/admin/coverage");
  const db = await createClient();
  const [{ data, error }, waitlist] = await Promise.all([
    db.rpc("cluster_coverage"),
    db.from("waitlist").select("area_id, areas(name)"),
  ]);
  if (error) throw error;
  const rows = data as { cluster_id: string; slug: string; name: string; status: string; listed: number; identified: number; waitlist: number }[];
  const byArea = new Map<string, number>();
  for (const w of (waitlist.data ?? []) as unknown as { areas: { name: string } | null }[]) {
    const n = w.areas?.name ?? "";
    byArea.set(n, (byArea.get(n) ?? 0) + 1);
  }
  const first = rows[0];
  return {
    clusters: rows,
    rule: first ? coverage(Number(first.listed), first.identified, appConfig.clusterOpenShare) : null,
    waitlistByArea: [...byArea.entries()],
  };
}

export async function setIdentified(clusterId: string, value: number) {
  await requireAdmin("/admin/coverage");
  const db = await createClient();
  await db.from("clusters").update({ identified_clubs: z.number().int().min(0).max(100000).parse(value) }).eq("id", uuid.parse(clusterId));
}
