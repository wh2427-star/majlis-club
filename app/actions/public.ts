"use server";
import { revalidatePath } from "next/cache";
import * as svc from "@/lib/services/public-actions";
import type { ActionState } from "@/lib/services/public-actions";

export async function joinWaitlistAction(_: ActionState, form: FormData) {
  return svc.joinWaitlist(form);
}

export async function suggestClubAction(_: ActionState, form: FormData) {
  return svc.suggestClub(form);
}

export async function reportPhotoAction(_: ActionState, form: FormData) {
  const res = await svc.reportPhoto(form);
  if (res.ok) revalidatePath("/clubs/[slug]", "page");
  return res;
}

export async function toggleSaveAction(_: ActionState, form: FormData) {
  const clubId = String(form.get("clubId") ?? "");
  const save = form.get("save") === "1";
  const res = await svc.setSaved(clubId, save);
  revalidatePath("/clubs/[slug]", "page");
  revalidatePath("/family");
  return res;
}
