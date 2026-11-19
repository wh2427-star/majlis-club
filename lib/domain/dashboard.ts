/** Club dashboard maths. Pure functions; no framework or database imports. */

/** Rounded percentage change; null when there is nothing to compare with. */
export function weekChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type ViewsTrend = { kind: "none" } | { kind: "fromZero" } | { kind: "percent"; value: number };

/** How this week's views compare with last week's, never claiming "no change" when views rose from zero. */
export function viewsTrend(current: number, previous: number): ViewsTrend {
  if (previous === 0) return current > 0 ? { kind: "fromZero" } : { kind: "none" };
  const value = weekChange(current, previous) ?? 0;
  return value === 0 ? { kind: "none" } : { kind: "percent", value };
}

export type ChecklistKey = "description" | "coachCredentials" | "ageGroups" | "photos" | "licence" | "schedule" | "prices";

export function profileChecklist(p: {
  description: string;
  coachCredentials: string;
  ageGroups: string[];
  photoCount: number;
  licenceVerified: boolean;
  sessionCount: number;
  planCount: number;
}): { key: ChecklistKey; done: boolean }[] {
  return [
    { key: "description", done: p.description.trim().length >= 40 },
    { key: "coachCredentials", done: p.coachCredentials.trim().length > 0 },
    { key: "ageGroups", done: p.ageGroups.length > 0 },
    { key: "photos", done: p.photoCount > 0 },
    { key: "licence", done: p.licenceVerified },
    { key: "schedule", done: p.sessionCount > 0 },
    { key: "prices", done: p.planCount > 0 },
  ];
}
