/** Club dashboard maths. Pure functions; no framework or database imports. */

const WEEK_MS = 7 * 864e5;

/** Counts per week, oldest first. Bucket i covers [now − (weeks−i)·7d, now − (weeks−i−1)·7d). */
export function weeklyCounts(timestamps: string[], now: Date, weeks = 6): number[] {
  const counts = new Array<number>(weeks).fill(0);
  const end = now.getTime();
  for (const ts of timestamps) {
    const age = end - new Date(ts).getTime();
    if (age < 0) continue;
    const back = Math.floor(age / WEEK_MS);
    if (back < weeks) counts[weeks - 1 - back]++;
  }
  return counts;
}

/** Rounded percentage change; null when there is nothing to compare with. */
export function weekChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type ChecklistKey = "description" | "coachCredentials" | "ageGroups" | "photos" | "licence" | "schedule";

export function profileChecklist(p: {
  description: string;
  coachCredentials: string;
  ageGroups: string[];
  photoCount: number;
  licenceVerified: boolean;
  sessionCount: number;
}): { key: ChecklistKey; done: boolean }[] {
  return [
    { key: "description", done: p.description.trim().length >= 40 },
    { key: "coachCredentials", done: p.coachCredentials.trim().length > 0 },
    { key: "ageGroups", done: p.ageGroups.length > 0 },
    { key: "photos", done: p.photoCount > 0 },
    { key: "licence", done: p.licenceVerified },
    { key: "schedule", done: p.sessionCount > 0 },
  ];
}
