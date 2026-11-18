/**
 * Family screen weekly view: the days and times already in saved listings, laid out as a week.
 * No fixtures, no messages, no payments.
 */
import type { Session } from "./types";

export type WeekEntry = {
  clubId: string;
  clubName: string;
  sportSlug: string;
  start: string;
  end: string;
  ageMin: number;
  ageMax: number;
};

export function buildWeek(
  saved: { clubId: string; clubName: string; sessions: Session[] }[],
  childAges: number[] = [],
): WeekEntry[][] {
  const week: WeekEntry[][] = Array.from({ length: 7 }, () => []);
  for (const club of saved) {
    for (const s of club.sessions) {
      // When the family has children on file, show sessions that fit at least one of them.
      if (childAges.length && !childAges.some((a) => a >= s.ageMin && a <= s.ageMax)) continue;
      week[s.day].push({
        clubId: club.clubId,
        clubName: club.clubName,
        sportSlug: s.sportSlug,
        start: s.start,
        end: s.end,
        ageMin: s.ageMin,
        ageMax: s.ageMax,
      });
    }
  }
  for (const day of week) day.sort((a, b) => a.start.localeCompare(b.start) || a.clubName.localeCompare(b.clubName));
  return week;
}
