"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { updateScheduleAction } from "@/app/actions/club";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { ClubProfile, type ProfileData } from "@/components/club/ClubProfile";
import { PhotoGallery } from "@/components/club/PhotoGallery";
import type { ClubPhoto } from "@/lib/data/queries";
import { FormError, useFieldError, useFormAction } from "./PublicForms";

type Opt = { value: string; label: string };
export type EditorSession = { sportId: string; sportSlug: string; day: number; start: string; end: string; ageMin: number; ageMax: number; priceAed: number };

/** Listing step 2: sessions, with a live preview in the order parents see the profile. */
export function ScheduleForm({
  clubId,
  profile,
  sessions: initial,
  primarySportId,
  sports,
  photos,
}: {
  clubId: string;
  profile: Omit<ProfileData, "sessions" | "sports">;
  sessions: EditorSession[];
  primarySportId: string | null;
  sports: (Opt & { slug: string })[];
  photos: ClubPhoto[];
}) {
  const t = useTranslations();
  const { state, pending, formProps } = useFormAction(updateScheduleAction);
  const err = useFieldError(state);
  const [sessions, setSessions] = useState<EditorSession[]>(initial);

  const sportSlug = (id: string) => sports.find((s) => s.value === id)?.slug ?? "";
  const update = (i: number, patch: Partial<EditorSession>) =>
    setSessions((list) => list.map((s, j) => (j === i ? { ...s, ...patch, sportSlug: patch.sportId ? sportSlug(patch.sportId) : s.sportSlug } : s)));
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`days.long.${d}`) }));
  const newSport = sports.find((s) => s.value === primarySportId) ?? sports[0];

  const preview = useMemo(
    () => ({
      ...profile,
      sessions: sessions.map((s, i) => ({ id: String(i), ...s })),
      sports: [...new Set([...sessions.map((s) => s.sportSlug), ...(primarySportId ? [sportSlug(primarySportId)] : [])])].filter(Boolean),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, sessions, primarySportId],
  );

  return (
    <div className="flex flex-col gap-6">
      <form {...formProps} className="flex flex-col gap-4 rounded-card bg-white p-4" noValidate>
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="sessions" value={JSON.stringify(sessions.map((s) => ({ sportId: s.sportId, day: s.day, start: s.start, end: s.end, ageMin: s.ageMin, ageMax: s.ageMax, priceAed: s.priceAed })))} />
        <fieldset className="flex flex-col gap-4">
          <legend className="text-xl font-semibold">{t("editor.sessions")}</legend>
          {sessions.map((s, i) => (
            <div key={i} className="grid gap-3 rounded-card border-2 border-ink p-3 sm:grid-cols-2" data-testid="session-editor">
              <SelectField id={`s${i}-sport`} label={t("onboard.sport")} value={s.sportId} onChange={(e) => update(i, { sportId: e.target.value })} options={sports} />
              <SelectField id={`s${i}-day`} label={t("onboard.day")} value={String(s.day)} onChange={(e) => update(i, { day: Number(e.target.value) })} options={days} />
              <TextField id={`s${i}-start`} type="time" label={t("onboard.start")} value={s.start} onChange={(e) => update(i, { start: e.target.value })} error={err(`session-${i}-start`)} />
              <TextField id={`s${i}-end`} type="time" label={t("onboard.end")} value={s.end} onChange={(e) => update(i, { end: e.target.value })} error={err(`session-${i}-end`)} />
              <TextField id={`s${i}-amin`} type="number" min={2} max={18} label={t("onboard.ageMin")} value={s.ageMin} onChange={(e) => update(i, { ageMin: Number(e.target.value) })} error={err(`session-${i}-ageMin`)} />
              <TextField id={`s${i}-amax`} type="number" min={2} max={18} label={t("onboard.ageMax")} value={s.ageMax} onChange={(e) => update(i, { ageMax: Number(e.target.value) })} error={err(`session-${i}-ageMax`)} />
              <TextField id={`s${i}-price`} type="number" min={0} label={t("onboard.price")} value={s.priceAed} onChange={(e) => update(i, { priceAed: Number(e.target.value) })} error={err(`session-${i}-priceAed`)} />
              <div className="flex items-end">
                <Button type="button" variant="quiet" onClick={() => setSessions((l) => l.filter((_, j) => j !== i))}>{t("editor.removeSession")}</Button>
              </div>
            </div>
          ))}
          <Button
            type="button" variant="secondary"
            onClick={() => setSessions((l) => [...l, { sportId: newSport.value, sportSlug: newSport.slug, day: 0, start: "16:30", end: "17:30", ageMin: 6, ageMax: 12, priceAed: 50 }])}
          >
            {t("editor.addSession")}
          </Button>
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
        />
      </section>
    </div>
  );
}
