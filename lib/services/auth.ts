import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, magicLinkSchema, signInSchema, signUpSchema } from "@/lib/schemas";
import type { ActionState } from "./public-actions";

/** Only allow same-site relative redirects after sign-in. */
export function safeNext(next: unknown, fallback = "/"): string {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
}

export async function signInWithPassword(form: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const db = await createClient();
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: "auth.failed" };
  return { ok: true };
}

export async function sendMagicLink(form: FormData): Promise<ActionState> {
  const parsed = magicLinkSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const db = await createClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const next = safeNext(form.get("next"));
  const { error } = await db.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
  });
  if (error) return { ok: false, message: "errors.generic" };
  return { ok: true, message: "auth.magicSent" };
}

export async function signUp(form: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    displayName: form.get("displayName"),
    role: form.get("role") ?? "parent",
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const db = await createClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await db.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName, role: parsed.data.role },
      emailRedirectTo: `${site}/auth/callback`,
    },
  });
  if (error) return { ok: false, message: "errors.generic" };
  // With email confirmation on, there is no session yet.
  return data.session ? { ok: true } : { ok: true, message: "auth.checkEmail" };
}

export async function signOut() {
  const db = await createClient();
  await db.auth.signOut();
}
