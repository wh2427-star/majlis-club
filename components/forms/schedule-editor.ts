/** Listing step 2 editor state, shared by the server page (which builds it) and the client form. */
import type { PlanKind, PricePlan } from "@/lib/domain/pricing";

export type EditorPlan = { kind: PlanKind; priceAed: string; sessionsCount: string; label: string };
export type EditorSession = { sportId: string; sportSlug: string; day: number; start: string; end: string; trialAvailable: boolean };
export type EditorGroup = { name: string; ageMin: number; ageMax: number; sessions: EditorSession[]; plans: EditorPlan[] };
export type EditorVenue = { name: string; areaId: string; lat: number; lng: number; groups: EditorGroup[] };

export const needsCount = (k: PlanKind) => k === "per_term" || k === "block";

export function toEditorPlan(p: PricePlan): EditorPlan {
  return { kind: p.kind, priceAed: String(p.priceAed), sessionsCount: p.sessionsCount == null ? "" : String(p.sessionsCount), label: p.label };
}
