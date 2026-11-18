/**
 * Turns structured club facts into words. Works with next-intl's translator on server or client.
 */
import { formatTime12, summariseSessions } from "@/lib/domain/facts";
import type { Session } from "@/lib/domain/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type T = (key: any, values?: Record<string, string | number>) => string;

const list = (items: string[], locale = "en") =>
  new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);

export function sportName(t: T, slug: string) {
  return t(`sports.${slug}`);
}

/** "Mon and Wed, 4:30pm" or "Mon 4:30pm, Sat 9:00am". */
export function daysAndTimes(t: T, sessions: Session[]): string {
  const facts = summariseSessions(sessions);
  if (!facts) return t("facts.noSessions");
  const allStarts = new Set(facts.schedule.flatMap((d) => d.starts));
  if (allStarts.size === 1) {
    const days = facts.schedule.map((d) => t(`days.short.${d.day}`));
    return t("facts.dayTimes", { days: list(days), time: formatTime12([...allStarts][0]) });
  }
  return facts.schedule
    .map((d) => `${t(`days.short.${d.day}`)} ${d.starts.map(formatTime12).join(", ")}`)
    .join(" · ");
}

export function agesText(t: T, sessions: Session[], short = false): string {
  const f = summariseSessions(sessions);
  return f ? t(short ? "facts.ageRange" : "facts.ages", { min: f.ageMin, max: f.ageMax }) : "";
}

export function priceText(t: T, sessions: Session[]): string {
  const f = summariseSessions(sessions);
  if (!f) return "";
  return f.priceMinAed === f.priceMaxAed
    ? t("facts.price", { price: f.priceMinAed })
    : t("facts.priceRange", { min: f.priceMinAed, max: f.priceMaxAed });
}

export function sportsText(t: T, sessions: Session[], fallback: string[] = []): string {
  const slugs = sessions.length ? [...new Set(sessions.map((s) => s.sportSlug))] : fallback;
  return list(slugs.map((s) => sportName(t, s)));
}
