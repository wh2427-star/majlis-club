/**
 * Turns structured club facts into words. Works with next-intl's translator on server or client.
 */
import { formatTime12, summariseSessions } from "@/lib/domain/facts";
import type { Group, Session } from "@/lib/domain/types";
import { cardPrice, type PricePlan } from "@/lib/domain/pricing";

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

/** The card's price: "from AED 75 a session", or "AED 3000 a year" when only yearly prices exist. */
export function priceText(t: T, plans: PricePlan[]): string {
  const p = cardPrice(plans);
  if (!p) return "";
  return p.kind === "perSession" ? t("facts.priceFrom", { price: p.aed }) : t("facts.pricePerYear", { price: p.aed });
}

/** One plan in words: "AED 900 a term (12 sessions)", with the owner's label first when there is one. */
export function planText(t: T, p: PricePlan): string {
  const text = t(`facts.plan.${p.kind}`, { price: p.priceAed, count: p.sessionsCount ?? 0 });
  return p.label ? t("facts.planLabelled", { label: p.label, text }) : text;
}

/** A group's name, or its age range when the club left the name blank. */
export function groupName(t: T, g: Pick<Group, "name" | "ageMin" | "ageMax">): string {
  return g.name.trim() || t("facts.ages", { min: g.ageMin, max: g.ageMax });
}

export function sportsText(t: T, sessions: Session[], fallback: string[] = []): string {
  const slugs = sessions.length ? [...new Set(sessions.map((s) => s.sportSlug))] : fallback;
  return list(slugs.map((s) => sportName(t, s)));
}
