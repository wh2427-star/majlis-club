/**
 * Row-level security tests against the Supabase project in .env.local (seeded with `npm run seed`).
 * They sign in as the demo accounts with the public key, exactly as the app does.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { demoAccounts } from "@/scripts/seed-data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const password = process.env.DEMO_ACCOUNT_PASSWORD!;

const client = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function signedIn(email: string) {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { c, id: data.user.id };
}

/** Reading a private table as an unauthorised role yields no rows or a permission error, never data. */
async function rowsVisible(c: SupabaseClient, table: string, filter?: [string, string]) {
  let q = c.from(table).select("*");
  if (filter) q = q.eq(filter[0], filter[1]);
  const { data, error } = await q;
  if (error) return 0;
  return data.length;
}

let anon: SupabaseClient;
let parentA: { c: SupabaseClient; id: string };
let parentB: { c: SupabaseClient; id: string };
let clubOwner: { c: SupabaseClient; id: string };
let admin: { c: SupabaseClient; id: string };

beforeAll(async () => {
  anon = client();
  [parentA, parentB, clubOwner, admin] = await Promise.all([
    signedIn(demoAccounts.parent.email),
    signedIn(demoAccounts.parent2.email),
    signedIn(demoAccounts.club.email),
    signedIn(demoAccounts.admin.email),
  ]);
});

describe("unauthenticated visitor", () => {
  it.each(["parents", "children", "enquiries", "saved_clubs", "profiles", "licences", "club_events", "waitlist", "photo_reports", "club_members", "club_claims", "club_suggestions"])(
    "cannot read %s",
    async (table) => {
      expect(await rowsVisible(anon, table)).toBe(0);
    },
  );

  it("sees approved clubs only", async () => {
    const { data } = await anon.from("clubs").select("slug, status");
    expect(data!.length).toBe(24);
    expect(data!.every((c) => c.status === "approved")).toBe(true);
  });

  it("does not see a photo under review", async () => {
    const { data } = await anon.from("club_photos").select("status");
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((p) => p.status === "visible")).toBe(true);
  });

  it("cannot write demand events directly", async () => {
    const { data: club } = await anon.from("clubs").select("id").limit(1).single();
    const { error } = await anon.from("club_events").insert({ club_id: club!.id, kind: "view" });
    expect(error).not.toBeNull();
  });

  it("cannot join a waitlist for a live area", async () => {
    const { data: area } = await anon.from("areas").select("id").eq("slug", "arabian-ranches").single();
    const { error } = await anon.from("waitlist").insert({ area_id: area!.id, email: "rls-test@example.com" });
    expect(error).not.toBeNull();
  });
});

describe("parents", () => {
  it("read only their own parent row, children, saved clubs and enquiries", async () => {
    for (const table of ["children", "saved_clubs", "enquiries"]) {
      const { data } = await parentA.c.from(table).select("parent_id");
      expect(data!.every((r) => r.parent_id === parentA.id), table).toBe(true);
    }
    expect(await rowsVisible(parentA.c, "parents", ["user_id", parentB.id])).toBe(0);
    expect(await rowsVisible(parentA.c, "parents", ["user_id", parentA.id])).toBe(1);
  });

  it("parent A cannot read parent B's data", async () => {
    expect(await rowsVisible(parentA.c, "children", ["parent_id", parentB.id])).toBe(0);
    expect(await rowsVisible(parentA.c, "enquiries", ["parent_id", parentB.id])).toBe(0);
    expect(await rowsVisible(parentA.c, "saved_clubs", ["parent_id", parentB.id])).toBe(0);
  });

  it("cannot add a child to another parent", async () => {
    const { error } = await parentA.c.from("children").insert({ parent_id: parentB.id, nickname: "x", birth_year: 2016 });
    expect(error).not.toBeNull();
  });

  it("cannot read a club's save count", async () => {
    const { data: club } = await parentA.c.from("clubs").select("id").eq("slug", "oryx-owls-football").single();
    const { data } = await parentA.c.rpc("club_save_count", { p_club: club!.id });
    expect(data ?? null).toBeNull();
  });

  it("cannot make themselves an admin", async () => {
    await parentA.c.from("profiles").update({ role: "admin" }).eq("user_id", parentA.id);
    const { data } = await parentA.c.from("profiles").select("role").eq("user_id", parentA.id).single();
    expect(data!.role).toBe("parent");
  });

  it("cannot read licences or demand events", async () => {
    expect(await rowsVisible(parentA.c, "licences")).toBe(0);
    expect(await rowsVisible(parentA.c, "club_events")).toBe(0);
  });
});

describe("club owners", () => {
  it("see enquiries for their own clubs only", async () => {
    const { data: mine } = await clubOwner.c.from("club_members").select("club_id");
    const myClubs = new Set(mine!.map((m) => m.club_id));
    const { data } = await clubOwner.c.from("enquiries").select("club_id");
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((e) => myClubs.has(e.club_id))).toBe(true);
  });

  it("cannot approve their own pending club", async () => {
    const { data: pending } = await clubOwner.c.from("clubs").select("id, status").eq("slug", "mirage-martial-arts").single();
    expect(pending!.status).toBe("pending");
    const { error } = await clubOwner.c.from("clubs").update({ status: "approved" }).eq("id", pending!.id);
    expect(error).not.toBeNull();
  });

  it("cannot edit a club they do not manage", async () => {
    const { data } = await clubOwner.c
      .from("clubs")
      .update({ description: "hijacked" })
      .eq("slug", "ghaf-tree-swim-squad")
      .select("id");
    expect(data ?? []).toEqual([]);
  });

  it("read the save count for their own club only", async () => {
    const { data: mine } = await clubOwner.c.from("clubs").select("id").eq("slug", "oryx-owls-football").single();
    const { data: other } = await clubOwner.c.from("clubs").select("id").eq("slug", "ghaf-tree-swim-squad").single();
    const own = await clubOwner.c.rpc("club_save_count", { p_club: mine!.id });
    expect(own.error).toBeNull();
    expect(typeof own.data).toBe("number");
    expect(own.data).toBeGreaterThanOrEqual(0);
    const theirs = await clubOwner.c.rpc("club_save_count", { p_club: other!.id });
    expect(theirs.data).toBeNull();
  });

  it("read six weekly view counts for their own club, matching the events, and none for other clubs", async () => {
    const { data: mine } = await clubOwner.c.from("clubs").select("id").eq("slug", "oryx-owls-football").single();
    const { data: other } = await clubOwner.c.from("clubs").select("id").eq("slug", "ghaf-tree-swim-squad").single();
    const own = await clubOwner.c.rpc("club_weekly_views", { p_club: mine!.id });
    expect(own.error).toBeNull();
    const weeks = own.data as number[];
    expect(weeks).toHaveLength(6);
    const since = new Date(Date.now() - 42 * 864e5).toISOString();
    const { count } = await clubOwner.c.from("club_events").select("id", { count: "exact", head: true })
      .eq("club_id", mine!.id).eq("kind", "view").gte("created_at", since);
    expect(weeks.reduce((a, b) => a + b, 0)).toBe(count);
    const theirs = await clubOwner.c.rpc("club_weekly_views", { p_club: other!.id });
    expect(theirs.data).toBeNull();
  });

  it("cannot read parents' private tables", async () => {
    expect(await rowsVisible(clubOwner.c, "parents", ["user_id", parentA.id])).toBe(0);
    expect(await rowsVisible(clubOwner.c, "children", ["parent_id", parentA.id])).toBe(0);
  });
});

describe("admin", () => {
  it("reads the licence queue and coverage", async () => {
    expect(await rowsVisible(admin.c, "licences")).toBeGreaterThan(0);
    const { data } = await admin.c.rpc("cluster_coverage");
    expect((data as unknown[]).length).toBe(2);
  });

  it("coverage is empty for non-admins", async () => {
    const { data } = await parentA.c.rpc("cluster_coverage");
    expect(data).toEqual([]);
  });
});
