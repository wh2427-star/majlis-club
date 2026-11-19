"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as club from "@/lib/services/club";
import type { ActionState } from "@/lib/services/public-actions";

export async function createClubAction(_: ActionState, form: FormData): Promise<ActionState> {
  const res = await club.createClub(form);
  if (!res.ok || !res.id) return res;
  redirect(`/club/${res.id}/edit?created=1`);
}

export async function claimClubAction(_: ActionState, form: FormData) {
  return club.claimClub(form);
}

export async function updateListingAction(_: ActionState, form: FormData) {
  const clubId = String(form.get("clubId") ?? "");
  const res = await club.updateListing(clubId, form);
  if (res.ok) {
    revalidatePath(`/club/${clubId}/edit`);
    revalidatePath("/clubs/[slug]", "page");
    revalidatePath("/results");
  }
  return res;
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

export async function setEnquiryStatusAction(form: FormData) {
  const clubId = String(form.get("clubId") ?? "");
  const status = String(form.get("status") ?? "");
  if (status !== "seen" && status !== "replied" && status !== "closed") return;
  await club.setEnquiryStatus(clubId, String(form.get("enquiryId") ?? ""), status);
  revalidatePath(`/club/${clubId}`);
}
