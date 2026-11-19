/**
 * Price plans: per session, per term (with a session count), per year, or a 5-10 session block.
 * Pure functions. Prices filter results; they never affect ranking.
 */
export type PlanKind = "per_session" | "per_term" | "per_year" | "block";

export type PricePlan = { id?: string; kind: PlanKind; priceAed: number; sessionsCount: number | null; label: string };

/** What one session costs on this plan; null for a yearly plan, which has no session count. */
export function perSessionEquivalent(p: PricePlan): number | null {
  if (p.kind === "per_session") return p.priceAed;
  if ((p.kind === "per_term" || p.kind === "block") && p.sessionsCount && p.sessionsCount > 0) return p.priceAed / p.sessionsCount;
  return null;
}

export type CardPrice = { kind: "perSession"; aed: number } | { kind: "perYear"; aed: number } | null;

/** The card's price: the lowest per-session equivalent, rounded up so "from" never understates. */
export function cardPrice(plans: PricePlan[]): CardPrice {
  const equivalents = plans.map(perSessionEquivalent).filter((v): v is number => v != null);
  if (equivalents.length) return { kind: "perSession", aed: Math.ceil(Math.min(...equivalents)) };
  const yearly = plans.filter((p) => p.kind === "per_year").map((p) => p.priceAed);
  if (yearly.length) return { kind: "perYear", aed: Math.min(...yearly) };
  return null;
}

/** True when some plan costs no more than maxAed a session. Clubs without a per-session figure drop out. */
export function withinMaxPrice(plans: PricePlan[], maxAed: number): boolean {
  return plans.some((p) => {
    const v = perSessionEquivalent(p);
    return v != null && v <= maxAed;
  });
}

/** The prices that apply to a group: its own when it has any, otherwise the club-wide ones. */
export function plansForGroup(
  club: { groups: { id: string; plans: PricePlan[] }[]; pricePlans: PricePlan[] },
  groupId: string,
): PricePlan[] {
  const own = club.groups.find((g) => g.id === groupId)?.plans ?? [];
  return own.length ? own : club.pricePlans;
}

/** Every price that applies to these sessions (each session's group plans, or the club-wide ones). */
export function plansForSessions(
  club: { groups: { id: string; plans: PricePlan[] }[]; pricePlans: PricePlan[] },
  sessions: { groupId: string }[],
): PricePlan[] {
  const groupIds = [...new Set(sessions.map((s) => s.groupId))];
  return groupIds.flatMap((id) => plansForGroup(club, id));
}
