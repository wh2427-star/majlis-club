"use client";
import type { ZodType } from "zod";
import { createClient } from "@/lib/supabase/browser";
import { fieldErrors } from "@/lib/schemas";
import { checkUploadFile, uploadRules, type UploadKind } from "@/lib/domain/uploads";
import type { ActionState } from "@/lib/services/public-actions";

/**
 * Wraps a server action so the file in `fileField` is uploaded straight from the browser to
 * storage first. The server action then receives only the stored `path`, never the file.
 * The form fields are validated before uploading so a rejected form leaves no stray file.
 */
export function withDirectUpload(
  kind: UploadKind,
  fileField: string,
  schema: ZodType,
  action: (state: ActionState, form: FormData) => Promise<ActionState>,
) {
  return async (state: ActionState, form: FormData): Promise<ActionState> => {
    const fields = Object.fromEntries([...form.entries()].filter(([k]) => k !== fileField));
    const parsed = schema.safeParse(fields);
    const errors: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);
    const file = form.get(fileField);
    const checked = checkUploadFile(kind, file instanceof File ? file : null);
    if ("error" in checked && checked.error) errors[fileField] = checked.error;
    if (Object.keys(errors).length) return { ok: false, errors };

    const clubId = String(form.get("clubId"));
    const path = `${clubId}/${crypto.randomUUID()}.${checked.ext}`;
    const db = createClient();
    const bucket = db.storage.from(uploadRules[kind].bucket);
    const up = await bucket.upload(path, file as File, { contentType: (file as File).type });
    if (up.error) return { ok: false, message: "errors.generic" };

    const next = new FormData();
    for (const [k, v] of Object.entries(fields)) next.set(k, v);
    next.set("path", path);
    const res = await action(state, next);
    if (!res.ok) await bucket.remove([path]);
    return res;
  };
}
