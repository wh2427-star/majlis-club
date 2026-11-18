"use server";
import { redirect } from "next/navigation";
import * as auth from "@/lib/services/auth";
import type { ActionState } from "@/lib/services/public-actions";

export async function signInAction(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await auth.signInWithPassword(form);
  if (!res.ok) return res;
  redirect(auth.safeNext(form.get("next")));
}

export async function magicLinkAction(_: ActionState, form: FormData) {
  return auth.sendMagicLink(form);
}

export async function signUpAction(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await auth.signUp(form);
  if (!res.ok || res.message) return res;
  redirect(form.get("role") === "club" ? "/club" : auth.safeNext(form.get("next"), "/family"));
}

export async function signOutAction() {
  await auth.signOut();
  redirect("/");
}
