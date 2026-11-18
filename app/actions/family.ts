"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as family from "@/lib/services/family";
import type { ActionState } from "@/lib/services/public-actions";

export async function sendEnquiryAction(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await family.sendEnquiry(form);
  if (!res.ok || !res.id) return res;
  revalidatePath("/family");
  redirect(`/enquire/sent/${res.id}`);
}

export async function addChildAction(_: ActionState, form: FormData) {
  const res = await family.addChild(form);
  if (res.ok) revalidatePath("/family");
  return res;
}

export async function removeChildAction(form: FormData) {
  await family.removeChild(String(form.get("id") ?? ""));
  revalidatePath("/family");
}
