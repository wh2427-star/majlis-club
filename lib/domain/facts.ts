/**
 * "Answers first": the facts every club card shows, in a fixed order:
 * sport, age range, days and times, area, price, distance.
 * Returns structured data; the UI turns it into words through i18n.
 */
import type { Session } from "./types";

export type ClubFacts = {
  sports: string[];
  ageMin: number;
  ageMax: number;
  /** Distinct days in week order, each with its distinct start times. */
  schedule: { day: number; starts: string[] }[];
};

export function summariseSessions(sessions: Session[]): ClubFacts | null {
  if (sessions.length === 0) return null;
  const sports = [...new Set(sessions.map((s) => s.sportSlug))];
  const byDay = new Map<number, Set<string>>();
  for (const s of sessions) {
    if (!byDay.has(s.day)) byDay.set(s.day, new Set());
    byDay.get(s.day)!.add(s.start);
  }
  const schedule = [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, starts]) => ({ day, starts: [...starts].sort() }));
  return {
    sports,
    ageMin: Math.min(...sessions.map((s) => s.ageMin)),
    ageMax: Math.max(...sessions.map((s) => s.ageMax)),
    schedule,
  };
}

/** "16:30:00" or "16:30" → { h: 16, m: 30 } */
export function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(":").map(Number);
  return { h, m };
}

/** "16:30" → "4:30pm" (the voice examples use this form). */
export function formatTime12(t: string): string {
  const { h, m } = parseTime(t);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

/** Child's age this year from birth year (we never store a birth date). */
export function ageFromBirthYear(birthYear: number, today = new Date()): number {
  return today.getFullYear() - birthYear;
}
