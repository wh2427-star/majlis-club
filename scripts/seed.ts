/**
 * Seeds DEMO DATA into the Supabase project in .env.local (service role).
 * Safe to re-run: removes previous demo clubs and recreates them.
 * Usage: npm run seed
 */
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  demoAccounts,
  demoOwnedClub,
  demoWeeklyViews,
  seedSaverCount,
  demoOwnedClubQuiet,
  firstClusterIdentified,
  placeholderPhotoSvg,
  seedClubs,
  waitlistSeed,
} from "./seed-data";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_ACCOUNT_PASSWORD;
if (!url || !serviceKey || !password) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEMO_ACCOUNT_PASSWORD in .env.local");
  process.exit(1);
}

const db: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false } });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function must<T>(res: { data: T; error: any }, what: string): NonNullable<T> {
  if (res.error) {
    console.error(`Failed: ${what}`, res.error);
    process.exit(1);
  }
  return res.data as NonNullable<T>;
}

const daysAgo = (n: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const dateIn = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

async function ensureUser(email: string, displayName: string, role: "parent" | "club") {
  const list = await db.auth.admin.listUsers({ perPage: 1000 });
  if (list.error) throw list.error;
  const existing = list.data.users.find((u) => u.email === email);
  if (existing) {
    const upd = await db.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    if (upd.error) throw upd.error;
    return existing.id;
  }
  const created = await db.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { display_name: displayName, role },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error(`create ${email}`);
  return created.data.user.id;
}

async function main() {
  // Reference rows
  const areas = must(await db.from("areas").select("id, slug, lat, lng, cluster_id"), "areas");
  const sports = must(await db.from("sports").select("id, slug"), "sports");
  const areaBy = Object.fromEntries(areas.map((a) => [a.slug, a]));
  const sportBy = Object.fromEntries(sports.map((s) => [s.slug, s.id]));

  // Users
  const ids: Record<keyof typeof demoAccounts, string> = {} as never;
  for (const [key, acc] of Object.entries(demoAccounts) as [keyof typeof demoAccounts, (typeof demoAccounts)[keyof typeof demoAccounts]][]) {
    ids[key] = await ensureUser(acc.email, acc.displayName, acc.role);
  }
  must(await db.from("profiles").update({ role: "admin" }).eq("user_id", ids.admin), "admin role");
  must(await db.from("profiles").update({ role: "club" }).eq("user_id", ids.club), "club role");

  // Clear previous demo data
  const slugs = [...seedClubs.map((c) => c.slug), "mirage-martial-arts"];
  const old = must(await db.from("clubs").select("id").in("slug", slugs), "old clubs");
  for (const c of old) {
    const files = must(await db.storage.from("club-photos").list(c.id), "list photos");
    if (files.length) await db.storage.from("club-photos").remove(files.map((f) => `${c.id}/${f.name}`));
  }
  if (old.length) must(await db.from("clubs").delete().in("id", old.map((c) => c.id)), "delete clubs");
  for (const uid of [ids.parent, ids.parent2]) {
    must(await db.from("children").delete().eq("parent_id", uid), "clear children");
  }
  must(await db.from("waitlist").delete().like("email", "%.demo@example.com"), "clear waitlist");

  // Clubs
  const clubIds: Record<string, string> = {};
  for (const c of seedClubs) {
    const area = areaBy[c.area];
    const row = must(
      await db
        .from("clubs")
        .insert({
          slug: c.slug,
          name: c.name,
          club_type: c.type,
          area_id: area.id,
          lat: area.lat + c.offset[0],
          lng: area.lng + c.offset[1],
          // The quiet club is left without a description so the profile and checklist show gaps.
          description: c.slug === demoOwnedClubQuiet ? "" : c.description,
          primary_sport_id: sportBy[c.sessions[0][0]],
          status: "approved",
          typical_reply_days: c.type === "community" ? 4 : 2,
        })
        .select("id")
        .single(),
      `club ${c.slug}`,
    );
    clubIds[c.slug] = row.id;

    const clubSports = [...new Set(c.sessions.map((s) => s[0]))].map((s) => ({ club_id: row.id, sport_id: sportBy[s] }));
    must(await db.from("club_sports").insert(clubSports), "club sports");
    must(
      await db.from("club_sessions").insert(
        c.sessions.map(([sport, day, start, end, ageMin, ageMax, price]) => ({
          club_id: row.id, sport_id: sportBy[sport], day, start_time: start, end_time: end, age_min: ageMin, age_max: ageMax, price_aed: price,
        })),
      ),
      "sessions",
    );

    if (c.licence) {
      const base = { club_id: row.id, number: `DEMO-${c.slug.slice(0, 6).toUpperCase()}-001`, issuing_authority: "Demo issuing authority [CONFIRM]" };
      const licence =
        c.licence === "verified"
          ? { ...base, status: "approved", expires_on: dateIn(300), reviewed_at: daysAgo(40), reviewed_by: ids.admin }
          : c.licence === "expired"
            ? { ...base, status: "approved", expires_on: dateIn(-10), reviewed_at: daysAgo(400), reviewed_by: ids.admin }
            : { ...base, status: "pending", expires_on: dateIn(200) };
      must(await db.from("licences").insert(licence), "licence");
    }
    if (c.trial) must(await db.from("promotions").insert({ club_id: row.id, kind: "trial_offer" }), "trial");
    if (c.featured) must(await db.from("promotions").insert({ club_id: row.id, kind: "featured", area_id: area.id }), "featured");

    for (let i = 0; i < c.photos; i++) {
      const sport = c.sessions[0][0];
      const path = `${row.id}/placeholder-${i + 1}.svg`;
      must(
        await db.storage.from("club-photos").upload(path, Buffer.from(placeholderPhotoSvg(sport, i)), { contentType: "image/svg+xml", upsert: true }),
        "upload photo",
      );
      must(
        await db.from("club_photos").insert({
          club_id: row.id,
          storage_path: path,
          alt_text: `Placeholder drawing of the ${sport.replace("-", " ")} ${sport === "swimming" ? "pool" : "venue"} at ${c.name}`,
          caption: i === 0 ? "Where we train" : "Kit and equipment",
          consent_confirmed_at: new Date().toISOString(),
          sort: i,
        }),
        "photo row",
      );
    }
  }

  // A pending club for the admin approvals queue, owned by the demo club account.
  const pending = must(
    await db.from("clubs").insert({
      slug: "mirage-martial-arts", name: "Mirage Martial Arts", club_type: "academy", area_id: areaBy["the-springs"].id,
      lat: areaBy["the-springs"].lat + 0.003, lng: areaBy["the-springs"].lng - 0.002, status: "pending",
      description: "Judo and jiu-jitsu for juniors.", created_by: ids.club,
    }).select("id").single(),
    "pending club",
  );
  must(await db.from("club_sessions").insert({ club_id: pending.id, sport_id: sportBy["martial-arts"], day: 2, start_time: "17:00", end_time: "18:00", age_min: 6, age_max: 14, price_aed: 70 }), "pending session");
  must(await db.from("club_sports").insert({ club_id: pending.id, sport_id: sportBy["martial-arts"] }), "pending sport");

  // Demo club owner manages two clubs: one busy, one quiet.
  must(await db.from("club_members").upsert([
    { club_id: clubIds[demoOwnedClub], user_id: ids.club, role: "owner" },
    { club_id: clubIds[demoOwnedClubQuiet], user_id: ids.club, role: "owner" },
  ]), "memberships");

  // Families
  must(await db.from("parents").update({ display_name: demoAccounts.parent.displayName, area_id: areaBy["arabian-ranches"].id, phone: "050 000 0000" }).eq("user_id", ids.parent), "parent");
  must(await db.from("parents").update({ display_name: demoAccounts.parent2.displayName, area_id: areaBy["the-springs"].id }).eq("user_id", ids.parent2), "parent2");
  const kids = must(
    await db.from("children").insert([
      { parent_id: ids.parent, nickname: "Bean", birth_year: new Date().getFullYear() - 8 },
      { parent_id: ids.parent, nickname: "Moss", birth_year: new Date().getFullYear() - 11 },
    ]).select("id, nickname, birth_year"),
    "children",
  );
  must(await db.from("saved_clubs").upsert([
    { parent_id: ids.parent, club_id: clubIds["oryx-owls-football"] },
    { parent_id: ids.parent, club_id: clubIds["ghaf-tree-swim-squad"] },
    { parent_id: ids.parent, club_id: clubIds["palm-shade-tennis"] },
  ]), "saved");

  // Fictional parents who shortlisted clubs (reused across runs; saves cascade away with the old clubs).
  const savers: string[] = [];
  for (let n = 1; n <= seedSaverCount; n++) savers.push(await ensureUser(`parent.seed.${n}@example.com`, `Seed Parent ${n}`, "parent"));
  must(await db.from("saved_clubs").upsert([
    ...savers.map((parent_id) => ({ parent_id, club_id: clubIds[demoOwnedClub] })),
    ...savers.slice(0, 2).map((parent_id) => ({ parent_id, club_id: clubIds[demoOwnedClubQuiet] })),
  ]), "seed saves");
  must(await db.from("clubs").update({ coach_credentials: "Level 2 licensed coaches, First Aid certified", age_groups: ["6-8", "9-12"] }).eq("id", clubIds[demoOwnedClub]), "oryx extras");

  // Enquiries: 11 to the busy club in the last 30 days (crosses the default threshold of 10).
  const enquiries = Array.from({ length: 11 }, (_, i) => ({
    parent_id: i === 0 ? ids.parent : ids.parent2,
    club_id: clubIds[demoOwnedClub],
    child_id: i === 0 ? kids[0].id : null,
    contact_name: i === 0 ? demoAccounts.parent.displayName : demoAccounts.parent2.displayName,
    contact_email: i === 0 ? demoAccounts.parent.email : demoAccounts.parent2.email,
    child_nickname: i === 0 ? kids[0].nickname : "Demo child",
    child_birth_year: i === 0 ? kids[0].birth_year : new Date().getFullYear() - 9,
    sport_id: sportBy.football,
    message: i === 0 ? "Is there space on Mondays this term?" : "Demo enquiry. Please ignore.",
    contact_consent_at: daysAgo(i * 2 + 1),
    status: i < 3 ? "sent" : i < 7 ? "seen" : "replied",
    created_at: daysAgo(i * 2 + 1),
  }));
  enquiries.push({ ...enquiries[0], club_id: clubIds["ghaf-tree-swim-squad"], child_id: kids[1].id, child_nickname: kids[1].nickname, child_birth_year: kids[1].birth_year, sport_id: sportBy.swimming, message: "Does Moss need to bring goggles?", status: "seen", created_at: daysAgo(5), contact_consent_at: daysAgo(5) });
  must(await db.from("enquiries").insert(enquiries), "enquiries");

  // Demand events: align enquiry events with enquiry dates, then add profile views.
  const demoClubIds = Object.values(clubIds);
  must(await db.from("club_events").delete().in("club_id", demoClubIds), "clear events");
  const events: { club_id: string; kind: "view" | "enquiry"; created_at: string }[] = enquiries.map((e) => ({ club_id: e.club_id, kind: "enquiry", created_at: e.created_at }));
  const views = (clubId: string, n: number, spread: number, offset = 0) => {
    for (let i = 0; i < n; i++) events.push({ club_id: clubId, kind: "view", created_at: daysAgo(offset + ((i * 7) % spread), 8 + (i % 12)) });
  };
  demoWeeklyViews.forEach((n, w) => {
    for (let k = 0; k < n; k++) events.push({ club_id: clubIds[demoOwnedClub], kind: "view", created_at: daysAgo((5 - w) * 7 + 1 + (k % 6), 8 + (k % 12)) });
  });
  views(clubIds[demoOwnedClubQuiet], 3, 29);
  for (const slug of Object.keys(clubIds)) if (slug !== demoOwnedClub && slug !== demoOwnedClubQuiet) views(clubIds[slug], 5 + (slug.length % 20), 29);
  must(await db.from("club_events").insert(events), "events");

  // A reported photo for the admin queue (the trigger hides it while under review).
  const reported = must(await db.from("club_photos").select("id").eq("club_id", clubIds["lakeside-lions-football"]).limit(1).single(), "photo to report");
  must(await db.from("photo_reports").insert({ photo_id: reported.id, reporter_id: ids.parent2, reason: "child_named_in_caption", note: "Demo report." }), "report");

  // Coming-soon waitlists and the coverage denominator
  for (const w of waitlistSeed) {
    must(await db.from("waitlist").insert(w.emails.map((email) => ({ area_id: areaBy[w.area].id, email }))), "waitlist");
  }
  must(await db.from("clusters").update({ identified_clubs: firstClusterIdentified }).eq("slug", "ranches-meadows-springs"), "identified");
  must(await db.from("clusters").update({ identified_clubs: 0 }).eq("slug", "umm-suqeim-jumeirah"), "identified 2");

  console.log(`Seeded ${seedClubs.length} approved demo clubs, 1 pending club, demo accounts:`);
  for (const acc of Object.values(demoAccounts)) console.log(`  ${acc.email}`);
  console.log("Password: the DEMO_ACCOUNT_PASSWORD from .env.local");
}

main();
