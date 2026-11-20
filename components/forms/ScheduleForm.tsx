"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { updateScheduleAction } from "@/app/actions/club";
import { Button } from "@/components/ui/Button";
import { Checkbox, SelectField, TextField } from "@/components/ui/Field";
import { ClubProfile, type ProfileData } from "@/components/club/ClubProfile";
import { PhotoGallery } from "@/components/club/PhotoGallery";
import type { ClubPhoto } from "@/lib/data/queries";
import type { PlanKind, PricePlan } from "@/lib/domain/pricing";
import { needsCount, type EditorGroup, type EditorPlan, type EditorSession, type EditorVenue } from "./schedule-editor";
import { FormError, useFieldError, useFormAction } from "./PublicForms";

type Opt = { value: string; label: string };
export type AreaOpt = Opt & { lat: number; lng: number };

const MAX_VENUES = 5;
const MAX_GROUPS = 10;
const MAX_PLANS = 8;
const MAX_SESSIONS = 14;
const planKinds: PlanKind[] = ["per_session", "per_term", "per_year", "block"];

function toPlan(p: EditorPlan): PricePlan {
  return { kind: p.kind, priceAed: Number(p.priceAed) || 0, sessionsCount: needsCount(p.kind) && p.sessionsCount ? Number(p.sessionsCount) : null, label: p.label.trim() };
}

/** What the server receives: the editor's tree, with prices as entered so the server can say what is wrong. */
function payload(venues: EditorVenue[], plans: EditorPlan[]) {
  const plan = (p: EditorPlan) => ({ kind: p.kind, priceAed: p.priceAed, sessionsCount: needsCount(p.kind) ? p.sessionsCount : "", label: p.label });
  return {
    plans: plans.map(plan),
    venues: venues.map((v) => ({
      name: v.name, areaId: v.areaId, lat: v.lat, lng: v.lng,
      groups: v.groups.map((g) => ({
        name: g.name, ageMin: g.ageMin, ageMax: g.ageMax,
        sessions: g.sessions.map((s) => ({ sportId: s.sportId, day: s.day, start: s.start, end: s.end, trialAvailable: s.trialAvailable })),
        plans: g.plans.map(plan),
      })),
    })),
  };
}

/** Price rows for one group, or for every venue. Module level so inputs keep focus while typing. */
function PlanRows({
  prefix,
  list,
  onChange,
  addLabel,
  err,
}: {
  prefix: string;
  list: EditorPlan[];
  onChange: (l: EditorPlan[]) => void;
  addLabel: string;
  err: (name: string) => string | undefined;
}) {
  const t = useTranslations();
  const kindOptions = planKinds.map((k) => ({ value: k, label: t(`editor.planKind.${k}`) }));
  const upd = (pi: number, patch: Partial<EditorPlan>) => onChange(list.map((p, j) => (j === pi ? { ...p, ...patch } : p)));
  return (
    <div className="flex flex-col gap-3">
      {list.map((p, pi) => {
        const id = `${prefix}p${pi}`;
        return (
          <div key={pi} className="grid gap-3 rounded-card bg-sand p-3 sm:grid-cols-2" data-testid="plan-editor">
            <SelectField id={`${id}-kind`} label={t("editor.planCharged")} value={p.kind} options={kindOptions} onChange={(e) => upd(pi, { kind: e.target.value as PlanKind })} />
            <TextField id={`${id}-price`} type="number" min={0} inputMode="decimal" label={t("editor.planPrice")} value={p.priceAed} onChange={(e) => upd(pi, { priceAed: e.target.value })} error={err(`${id}-priceAed`)} />
            {needsCount(p.kind) ? (
              <TextField
                id={`${id}-count`} type="number" min={1} label={t("editor.planSessions")}
                hint={p.kind === "block" ? t("editor.planBlockHint") : undefined}
                value={p.sessionsCount} onChange={(e) => upd(pi, { sessionsCount: e.target.value })} error={err(`${id}-sessionsCount`)}
              />
            ) : null}
            <TextField id={`${id}-label`} label={t("editor.planLabel")} hint={t("editor.planLabelHint")} maxLength={40} value={p.label} onChange={(e) => upd(pi, { label: e.target.value })} error={err(`${id}-label`)} />
            <div className="flex items-end">
              <Button type="button" variant="quiet" onClick={() => onChange(list.filter((_, j) => j !== pi))}>{t("editor.removePlan")}</Button>
            </div>
          </div>
        );
      })}
      {list.length < MAX_PLANS ? (
        <Button type="button" variant="secondary" onClick={() => onChange([...list, { kind: "per_session", priceAed: "", sessionsCount: "", label: "" }])}>
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}

/** Listing step 2: venues, each with age groups (times and prices), plus prices for every venue. Live preview below. */
export function ScheduleForm({
  clubId,
  profile,
  venues: initialVenues,
  plans: initialPlans,
  primarySportId,
  sports,
  areas,
  photos,
}: {
  clubId: string;
  profile: Omit<ProfileData, "sessions" | "sports" | "venues" | "groups" | "pricePlans">;
  venues: EditorVenue[];
  plans: EditorPlan[];
  primarySportId: string | null;
  sports: (Opt & { slug: string })[];
  areas: AreaOpt[];
  photos: ClubPhoto[];
}) {
  const t = useTranslations();
  const { state, pending, formProps } = useFormAction(updateScheduleAction);
  const err = useFieldError(state);
  const [venues, setVenues] = useState<EditorVenue[]>(initialVenues);
  const [plans, setPlans] = useState<EditorPlan[]>(initialPlans);

  const sportSlug = (id: string) => sports.find((s) => s.value === id)?.slug ?? "";
  const newSport = sports.find((s) => s.value === primarySportId) ?? sports[0];
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`days.long.${d}`) }));
  const updVenue = (vi: number, patch: Partial<EditorVenue>) => setVenues((l) => l.map((v, i) => (i === vi ? { ...v, ...patch } : v)));
  const updGroups = (vi: number, fn: (g: EditorGroup[]) => EditorGroup[]) => setVenues((l) => l.map((v, i) => (i === vi ? { ...v, groups: fn(v.groups) } : v)));
  const updGroup = (vi: number, gi: number, fn: (g: EditorGroup) => EditorGroup) => updGroups(vi, (gs) => gs.map((g, j) => (j === gi ? fn(g) : g)));

  const preview = useMemo<ProfileData>(() => {
    const areaName = (id: string) => areas.find((a) => a.value === id)?.label ?? "";
    const vs = venues.map((v, vi) => ({ id: `v${vi}`, name: v.name || "…", areaId: v.areaId, areaName: areaName(v.areaId), lat: v.lat, lng: v.lng }));
    const gs = venues.flatMap((v, vi) =>
      v.groups.map((g, gi) => ({ id: `v${vi}g${gi}`, venueId: `v${vi}`, name: g.name, ageMin: g.ageMin, ageMax: g.ageMax, plans: g.plans.map(toPlan) })),
    );
    const ss = venues.flatMap((v, vi) =>
      v.groups.flatMap((g, gi) =>
        g.sessions.map((s, si) => ({
          id: `v${vi}g${gi}s${si}`, sportSlug: s.sportSlug, day: s.day, start: s.start, end: s.end,
          ageMin: g.ageMin, ageMax: g.ageMax, venueId: `v${vi}`, groupId: `v${vi}g${gi}`, trialAvailable: s.trialAvailable,
        })),
      ),
    );
    const slugs = [...new Set([...ss.map((s) => s.sportSlug), ...(primarySportId ? [sportSlug(primarySportId)] : [])])].filter(Boolean);
    return { ...profile, venues: vs, groups: gs, sessions: ss, sports: slugs, pricePlans: plans.map(toPlan), trialOffer: ss.some((s) => s.trialAvailable) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, venues, plans, primarySportId, areas]);

  return (
    <div className="flex flex-col gap-6">
      <form {...formProps} className="flex flex-col gap-4 rounded-card bg-white p-4" noValidate>
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="schedule" value={JSON.stringify(payload(venues, plans))} />

        {venues.map((v, vi) => (
          <fieldset key={vi} className="flex flex-col gap-4 rounded-card border-2 border-ink p-3" data-testid="venue-editor">
            <legend className="px-1 text-xl font-semibold">{t("editor.venueN", { n: vi + 1 })}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField id={`v${vi}-name`} label={t("editor.venueName")} maxLength={80} value={v.name} onChange={(e) => updVenue(vi, { name: e.target.value })} error={err(`v${vi}-name`)} />
              <SelectField
                id={`v${vi}-area`} label={t("editor.venueArea")} value={v.areaId} options={areas}
                onChange={(e) => {
                  const a = areas.find((x) => x.value === e.target.value);
                  updVenue(vi, { areaId: e.target.value, ...(a ? { lat: a.lat, lng: a.lng } : {}) });
                }}
                error={err(`v${vi}-areaId`)}
              />
            </div>

            {v.groups.map((g, gi) => {
              const gp = `v${vi}-g${gi}`;
              return (
                <fieldset key={gi} className="flex flex-col gap-3 border-s-4 border-emerald ps-3">
                  <legend className="font-semibold">{t("editor.groupN", { n: gi + 1 })}</legend>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <TextField id={`${gp}-name`} label={t("editor.groupName")} hint={t("editor.groupNameHint")} maxLength={60} value={g.name} onChange={(e) => updGroup(vi, gi, (x) => ({ ...x, name: e.target.value }))} error={err(`${gp}-name`)} />
                    <TextField id={`${gp}-amin`} type="number" min={2} max={18} label={t("onboard.ageMin")} value={g.ageMin} onChange={(e) => updGroup(vi, gi, (x) => ({ ...x, ageMin: Number(e.target.value) }))} error={err(`${gp}-ageMin`)} />
                    <TextField id={`${gp}-amax`} type="number" min={2} max={18} label={t("onboard.ageMax")} value={g.ageMax} onChange={(e) => updGroup(vi, gi, (x) => ({ ...x, ageMax: Number(e.target.value) }))} error={err(`${gp}-ageMax`)} />
                  </div>

                  <p className="font-semibold">{t("editor.times")}</p>
                  {g.sessions.map((s, si) => {
                    const sp = `${gp}-s${si}`;
                    const updS = (patch: Partial<EditorSession>) =>
                      updGroup(vi, gi, (x) => ({ ...x, sessions: x.sessions.map((y, k) => (k === si ? { ...y, ...patch } : y)) }));
                    return (
                      <div key={si} className="grid gap-3 rounded-card bg-sand p-3 sm:grid-cols-2" data-testid="session-editor">
                        <SelectField id={`${sp}-sport`} label={t("onboard.sport")} value={s.sportId} options={sports} onChange={(e) => updS({ sportId: e.target.value, sportSlug: sportSlug(e.target.value) })} />
                        <SelectField id={`${sp}-day`} label={t("onboard.day")} value={String(s.day)} options={days} onChange={(e) => updS({ day: Number(e.target.value) })} />
                        <TextField id={`${sp}-start`} type="time" label={t("onboard.start")} value={s.start} onChange={(e) => updS({ start: e.target.value })} error={err(`${sp}-start`)} />
                        <TextField id={`${sp}-end`} type="time" label={t("onboard.end")} value={s.end} onChange={(e) => updS({ end: e.target.value })} error={err(`${sp}-end`)} />
                        <Checkbox id={`${sp}-trial`} label={t("editor.offerTrial")} checked={s.trialAvailable} onChange={(e) => updS({ trialAvailable: e.target.checked })} />
                        <div className="flex items-end">
                          <Button type="button" variant="quiet" onClick={() => updGroup(vi, gi, (x) => ({ ...x, sessions: x.sessions.filter((_, k) => k !== si) }))}>
                            {t("editor.removeSession")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {g.sessions.length < MAX_SESSIONS ? (
                    <Button
                      type="button" variant="secondary"
                      onClick={() => updGroup(vi, gi, (x) => ({ ...x, sessions: [...x.sessions, { sportId: newSport.value, sportSlug: newSport.slug, day: 0, start: "16:30", end: "17:30", trialAvailable: false }] }))}
                    >
                      {t("editor.addSession")}
                    </Button>
                  ) : null}

                  <p className="font-semibold">{t("editor.groupPrices")}</p>
                  <p className="text-sm">{t("editor.groupPricesHint")}</p>
                  <PlanRows prefix={`${gp}-`} list={g.plans} onChange={(l) => updGroup(vi, gi, (x) => ({ ...x, plans: l }))} addLabel={t("editor.addGroupPlan")} err={err} />
                  <Button type="button" variant="quiet" onClick={() => updGroups(vi, (gs) => gs.filter((_, j) => j !== gi))}>{t("editor.removeGroup")}</Button>
                </fieldset>
              );
            })}
            {v.groups.length < MAX_GROUPS ? (
              <Button type="button" variant="secondary" onClick={() => updGroups(vi, (gs) => [...gs, { name: "", ageMin: 6, ageMax: 12, sessions: [], plans: [] }])}>
                {t("editor.addGroup")}
              </Button>
            ) : null}
            {venues.length > 1 ? (
              <Button type="button" variant="quiet" onClick={() => setVenues((l) => l.filter((_, i) => i !== vi))}>{t("editor.removeVenue")}</Button>
            ) : null}
          </fieldset>
        ))}
        {venues.length < MAX_VENUES ? (
          <Button
            type="button" variant="secondary"
            onClick={() => {
              const a = areas.find((x) => x.value === venues[0]?.areaId) ?? areas[0];
              setVenues((l) => [...l, { name: "", areaId: a.value, lat: a.lat, lng: a.lng, groups: [{ name: "", ageMin: 6, ageMax: 12, sessions: [], plans: [] }] }]);
            }}
          >
            {t("editor.addVenue")}
          </Button>
        ) : null}

        <fieldset className="flex flex-col gap-3 rounded-card border-2 border-ink p-3">
          <legend className="px-1 text-xl font-semibold">{t("club.pricesTitle")}</legend>
          <p className="text-sm">{t("editor.clubPricesHint")}</p>
          <PlanRows prefix="" list={plans} onChange={setPlans} addLabel={t("editor.addClubPlan")} err={err} />
        </fieldset>

        <FormError state={state} />
        <Button type="submit" disabled={pending}>{t("wizard.continuePhotos")}</Button>
      </form>

      <section aria-labelledby="preview-h" className="rounded-card border-2 border-dashed border-ink p-4" data-testid="live-preview">
        <h2 id="preview-h" className="mb-3 text-sm font-semibold">{t("editor.preview")}</h2>
        <ClubProfile
          club={preview}
          headingLevel={2}
          photos={photos.length ? <PhotoGallery photos={photos} signedIn={false} reportable={false} /> : null}
          actions={<Button type="button" disabled>{t("club.sendEnquiry")}</Button>}
          trialAction={() => <Button type="button" variant="secondary" disabled>{t("trial.book")}</Button>}
        />
      </section>
    </div>
  );
}
