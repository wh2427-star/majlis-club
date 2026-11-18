"use server";
import { revalidatePath } from "next/cache";
import * as admin from "@/lib/services/admin";

const s = (form: FormData, k: string) => String(form.get(k) ?? "");

export async function approveLicenceAction(form: FormData) {
  await admin.approveLicence(s(form, "id"), s(form, "expiresOn"));
  revalidatePath("/admin", "layout");
}

export async function rejectLicenceAction(form: FormData) {
  await admin.rejectLicence(s(form, "id"), s(form, "reason"));
  revalidatePath("/admin", "layout");
}

export async function resolveReportAction(form: FormData) {
  await admin.resolveReport(s(form, "id"), s(form, "outcome") === "upheld" ? "upheld" : "dismissed");
  revalidatePath("/admin", "layout");
}

export async function decideClubAction(form: FormData) {
  await admin.decideClub(s(form, "id"), s(form, "decision") === "approve", s(form, "reason"));
  revalidatePath("/admin", "layout");
}

export async function decideClaimAction(form: FormData) {
  await admin.decideClaim(s(form, "id"), s(form, "decision") === "approve");
  revalidatePath("/admin", "layout");
}

export async function setIdentifiedAction(form: FormData) {
  await admin.setIdentified(s(form, "id"), Number(s(form, "identified")));
  revalidatePath("/admin/coverage");
}
