/**
 * Small product rules that are easy to get wrong in the UI. Framework-free.
 */

/** Rule 8: the badge shows only for an approved licence that has not expired. */
export function isLicenceVerified(
  licences: { status: string; expiresOn: string }[],
  today: string = new Date().toISOString().slice(0, 10),
): boolean {
  return licences.some((l) => l.status === "approved" && l.expiresOn >= today);
}

export type LicenceState = "none" | "pending" | "verified" | "expired" | "rejected";

export function licenceState(
  licences: { status: string; expiresOn: string; createdAt: string }[],
  today: string = new Date().toISOString().slice(0, 10),
): LicenceState {
  if (licences.length === 0) return "none";
  if (isLicenceVerified(licences, today)) return "verified";
  const latest = [...licences].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (latest.status === "pending") return "pending";
  if (latest.status === "rejected") return "rejected";
  return "expired";
}

/** Coverage: second cluster may open at 25% of identified first-cluster clubs listed. Never automated. */
export function coverage(listed: number, identified: number, share = 0.25) {
  const needed = Math.ceil(identified * share);
  return {
    listed,
    identified,
    needed,
    ratio: identified > 0 ? listed / identified : 0,
    thresholdMet: identified > 0 && listed >= needed,
  };
}

/** Upgrade prompt: shown only when demand crosses the threshold. The trigger is demand, never a calendar. */
export function shouldShowUpgradePrompt(enquiriesLast30Days: number, threshold: number): boolean {
  return threshold > 0 && enquiriesLast30Days >= threshold;
}

/**
 * Rule 7: captions must not contain children's names. We cannot know names, so we flag
 * capitalised words after the first word that are not known place, sport or club words.
 * This is a hint, not a block; parents can also report a photo for this reason.
 */
const ALLOWED_CAPITALISED = new Set([
  "U8", "U9", "U10", "U11", "U12", "U13", "U14", "U15", "U16",
  "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
  "Arabian", "Ranches", "Meadows", "Springs", "Dubai", "Umm", "Suqeim", "Jumeirah", "UAE",
  "Club", "Academy", "Cup", "League", "Team", "Under", "Sports", "Day", "Term", "Final",
]);

export function captionNameWarning(caption: string, extraAllowed: string[] = []): string[] {
  const allowed = new Set([...ALLOWED_CAPITALISED, ...extraAllowed.flatMap((w) => w.split(/\s+/))]);
  const words = caption.split(/[\s,.;:!?()"'·-]+/).filter(Boolean);
  const flagged = words.slice(1).filter((w) => /^[A-Z][a-z]{1,}$/.test(w) && !allowed.has(w));
  return [...new Set(flagged)];
}
