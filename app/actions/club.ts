"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as club from "@/lib/services/club";
import type { ActionState } from "@/lib/services/public-actions";

export async function createClubAction(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await club.createClub(form);
  if (!res.ok || !res.id) return res;
  redirect(`/club/${res.id}/edit/schedule?created=1`);
}

export async function claimClubAction(_: ActionState, form: FormData) {
  return club.claimClub(form);
}

function revalidateListing(clubId: string) {
  revalidatePath(`/club/${clubId}`, "layout");
  revalidatePath("/clubs/[slug]", "page");
  revalidatePath("/results");
}

/** Step 1 saved: go on to the schedule. */
export async function updateBasicsAction(_: ActionState, form: FormData): Promise<ActionState> {
  const clubId = String(form.get("clubId") ?? "");
  const res = await club.updateBasics(clubId, form);
  if (!res.ok) return res;
  revalidateListing(clubId);
  redirect(`/club/${clubId}/edit/schedule`);
}

/** Step 2 saved: go on to photos. */
export async function updateScheduleAction(_: ActionState, form: FormData): Promise<ActionState> {
  const clubId = String(form.get("clubId") ?? "");
  const res = await club.updateSchedule(clubId, form);
  if (!res.ok) return res;
  revalidateListing(clubId);
  redirect(`/club/${clubId}/photos`);
}

export async function uploadPhotoAction(_: ActionState, form: FormData) {
  const res = await club.uploadPhoto(form);
  if (res.ok) revalidatePath(`/club/${form.get("clubId")}/photos`);
  return res;
}

export async function deletePhotoAction(form: FormData) {
  const clubId = String(form.get("clubId") ?? "");
  await club.deletePhoto(clubId, String(form.get("photoId") ?? ""));
  revalidatePath(`/club/${clubId}/photos`);
}

export async function submitLicenceAction(_: ActionState, form: FormData) {
  const res = await club.submitLicence(form);
  if (res.ok) revalidatePath(`/club/${form.get("clubId")}/licence`);
  return res;
}

export async function setTrialStatusAction(form: FormData) {
  const clubId = String(form.get("clubId") ?? "");
  const status = String(form.get("status") ?? "");
  if (status !== "accepted" && status !== "declined") return;
  await club.setTrialStatus(clubId, String(form.get("trialId") ?? ""), status);
  revalidatePath(`/club/${clubId}`);
}

export async function setEnquiryStatusAction(form: FormData) {
  const clubId = String(form.get("clubId") ?? "");
  const status = String(form.get("status") ?? "");
  if (status !== "seen" && status !== "replied" && status !== "closed") return;
  await club.setEnquiryStatus(clubId, String(form.get("enquiryId") ?? ""), status);
  revalidatePath(`/club/${clubId}`);
}
