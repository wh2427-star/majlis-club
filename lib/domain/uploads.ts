/**
 * Upload rules shared by the browser (which uploads straight to storage) and the server
 * (which checks the stored path before recording it). Framework-free.
 *
 * Files go directly from the browser to Supabase Storage so hosting platforms' request-size
 * limits (about 4.5–6 MB) never apply; storage policies restrict uploads to club members.
 */
export type UploadKind = "photo" | "licence";

export const uploadRules: Record<UploadKind, { bucket: string; maxBytes: number; types: Record<string, string> }> = {
  photo: {
    bucket: "club-photos",
    maxBytes: 5 * 1024 * 1024,
    types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
  },
  licence: {
    bucket: "licences",
    maxBytes: 10 * 1024 * 1024,
    types: { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" },
  },
};

/** Returns the file extension to use, or an i18n error key. */
export function checkUploadFile(kind: UploadKind, file: { size: number; type: string } | null | undefined) {
  if (!file || file.size === 0) return { error: "errors.file" as const };
  const rule = uploadRules[kind];
  const ext = rule.types[file.type];
  if (!ext || file.size > rule.maxBytes) return { error: "errors.fileType" as const };
  return { ext };
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** A stored path must be "<clubId>/<uuid>.<allowed ext>" for this club. */
export function isValidUploadPath(kind: UploadKind, clubId: string, path: string) {
  const exts = [...new Set(Object.values(uploadRules[kind].types))].join("|");
  return new RegExp(`^${UUID}/${UUID}\\.(${exts})$`).test(path) && path.startsWith(`${clubId}/`);
}
