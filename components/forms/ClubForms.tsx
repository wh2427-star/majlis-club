"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { claimClubAction, createClubAction, submitLicenceAction, updateListingAction, uploadPhotoAction } from "@/app/actions/club";
import { Button } from "@/components/ui/Button";
import { Checkbox, SelectField, TextArea, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { ClubProfile } from "@/components/club/ClubProfile";
import { PhotoGallery } from "@/components/club/PhotoGallery";
import { captionNameWarning } from "@/lib/domain/rules";
import type { ClubPhoto } from "@/lib/data/queries";
import type { ActionState } from "@/lib/services/public-actions";
import { FormError, useFieldError, useFormAction } from "./PublicForms";

type Opt = { value: string; label: string };

function SuccessNotice({ state }: { state: ActionState }) {
  const t = useTranslations();
  return state.ok && state.message ? <Notice tone="success">{t(state.message)}</Notice> : null;
}

function SessionFields({ prefix, sports, err }: { prefix: string; sports: Opt[]; err: (n: string) => string | undefined }) {
  const t = useTranslations();
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`days.long.${d}`) }));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField id={`${prefix}-sport`} name="sportId" label={t("onboard.sport")} options={sports} error={err("sportId")} />
      <SelectField id={`${prefix}-day`} name="day" label={t("onboard.day")} options={days} />
      <TextField id={`${prefix}-start`} name="start" type="time" required defaultValue="16:30" label={t("onboard.start")} error={err("start")} />
      <TextField id={`${prefix}-end`} name="end" type="time" required defaultValue="17:30" label={t("onboard.end")} error={err("end")} />
      <TextField id={`${prefix}-agemin`} name="ageMin" type="number" min={2} max={18} required defaultValue={6} label={t("onboard.ageMin")} error={err("ageMin")} />
      <TextField id={`${prefix}-agemax`} name="ageMax" type="number" min={2} max={18} required defaultValue={12} label={t("onboard.ageMax")} error={err("ageMax")} />
      <TextField id={`${prefix}-price`} name="priceAed" type="number" min={0} step="1" required label={t("onboard.price")} error={err("priceAed")} />
    </div>
  );
}

/** "Can't see your club? Add it in two minutes." Name, type, area and one session. */
export function CreateClubForm({ areas, sports }: { areas: Opt[]; sports: Opt[] }) {
  const t = useTranslations("onboard");
  const { state, pending, formProps } = useFormAction(createClubAction);
  const err = useFieldError(state);
  return (
    <form {...formProps} className="flex flex-col gap-4" noValidate>
      <TextField id="new-name" name="name" required label={t("name")} error={err("name")} />
      <fieldset>
        <legend className="font-semibold">{t("type")}</legend>
        <p className="text-sm">{t("typeHint")}</p>
        {(["academy", "community"] as const).map((v, i) => (
          <label key={v} className="flex min-h-tap items-center gap-3">
            <input type="radio" name="clubType" value={v} defaultChecked={i === 0} className="size-6 accent-emerald" />
            <TypeLabel value={v} />
          </label>
        ))}
      </fieldset>
      <SelectField id="new-area" name="areaId" label={t("area")} options={areas} error={err("areaId")} />
      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold">{t("firstSession")}</legend>
        <SessionFields prefix="new" sports={sports} err={err} />
      </fieldset>
      <FormError state={state} />
      <Button type="submit" disabled={pending}>{t("create")}</Button>
    </form>
  );
}

function TypeLabel({ value }: { value: "academy" | "community" }) {
  const t = useTranslations("clubType");
  return <span>{t(value)}</span>;
}

export function ClaimClubForm({ clubId }: { clubId: string }) {
  const t = useTranslations("onboard");
  const { state, pending, formProps } = useFormAction(claimClubAction);
  if (state.ok) return <Notice tone="success">{t("claimSent")}</Notice>;
  return (
    <form {...formProps}>
      <input type="hidden" name="clubId" value={clubId} />
      <Button type="submit" variant="secondary" disabled={pending}>{t("claimButton")}</Button>
      <FormError state={state} />
    </form>
  );
}

type EditorSession = { sportId: string; sportSlug: string; day: number; start: string; end: string; ageMin: number; ageMax: number; priceAed: number };

/** The listing editor: same component and order as the public page, with a live preview. */
export function ListingEditor({
  club,
  areas,
  sports,
  photos,
}: {
  club: {
    id: string; name: string; clubType: "academy" | "community"; areaId: string; description: string; typicalReplyDays: number;
    licenceVerified: boolean; trialOffer: boolean; sessions: EditorSession[];
  };
  areas: (Opt & { name: string })[];
  sports: (Opt & { slug: string })[];
  photos: ClubPhoto[];
}) {
  const t = useTranslations();
  const { state, pending, formProps } = useFormAction(updateListingAction);
  const err = useFieldError(state);
  const [name, setName] = useState(club.name);
  const [clubType, setClubType] = useState(club.clubType);
  const [areaId, setAreaId] = useState(club.areaId);
  const [description, setDescription] = useState(club.description);
  const [replyDays, setReplyDays] = useState(club.typicalReplyDays);
  const [sessions, setSessions] = useState<EditorSession[]>(club.sessions);

  const sportSlug = (id: string) => sports.find((s) => s.value === id)?.slug ?? "";
  const update = (i: number, patch: Partial<EditorSession>) =>
    setSessions((list) => list.map((s, j) => (j === i ? { ...s, ...patch, sportSlug: patch.sportId ? sportSlug(patch.sportId) : s.sportSlug } : s)));
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`days.long.${d}`) }));

  const preview = useMemo(
    () => ({
      name,
      clubType,
      areaName: areas.find((a) => a.value === areaId)?.name ?? "",
      description,
      sessions: sessions.map((s, i) => ({ id: String(i), ...s })),
      sports: [...new Set(sessions.map((s) => s.sportSlug))],
      licenceVerified: club.licenceVerified,
      trialOffer: club.trialOffer,
      typicalReplyDays: replyDays,
    }),
    [name, clubType, areaId, description, sessions, replyDays, areas, club.licenceVerified, club.trialOffer],
  );

  return (
    <div className="flex flex-col gap-6">
      <form {...formProps} className="flex flex-col gap-4 rounded-card bg-white p-4" noValidate>
        <input type="hidden" name="clubId" value={club.id} />
        <input type="hidden" name="sessions" value={JSON.stringify(sessions.map((s) => ({ sportId: s.sportId, day: s.day, start: s.start, end: s.end, ageMin: s.ageMin, ageMax: s.ageMax, priceAed: s.priceAed })))} />
        <h2 className="text-xl font-semibold">{t("editor.details")}</h2>
        <TextField id="ed-name" name="name" required value={name} onChange={(e) => setName(e.target.value)} label={t("onboard.name")} error={err("name")} />
        <SelectField
          id="ed-type" name="clubType" value={clubType} onChange={(e) => setClubType(e.target.value as typeof clubType)}
          label={t("onboard.type")} hint={t("onboard.typeHint")}
          options={[{ value: "academy", label: t("clubType.academy") }, { value: "community", label: t("clubType.community") }]}
        />
        <SelectField id="ed-area" name="areaId" value={areaId} onChange={(e) => setAreaId(e.target.value)} label={t("onboard.area")} options={areas} />

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
            onClick={() =>
              setSessions((l) => [...l, { sportId: sports[0].value, sportSlug: sports[0].slug, day: 0, start: "16:30", end: "17:30", ageMin: 6, ageMax: 12, priceAed: 50 }])
            }
          >
            {t("editor.addSession")}
          </Button>
        </fieldset>

        <TextArea
          id="ed-desc" name="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1500}
          label={t("editor.description")} hint={t("editor.descriptionHint")} error={err("description")}
        />
        <TextField
          id="ed-reply" name="typicalReplyDays" type="number" min={1} max={14} value={replyDays}
          onChange={(e) => setReplyDays(Number(e.target.value))} label={t("editor.replyDays")}
        />
        <FormError state={state} />
        <SuccessNotice state={state} />
        <Button type="submit" disabled={pending}>{t("editor.saveChanges")}</Button>
      </form>

      <section aria-labelledby="preview-h" className="rounded-card border-2 border-dashed border-ink p-4" data-testid="live-preview">
        <h2 id="preview-h" className="mb-3 text-sm font-semibold">{t("editor.preview")}</h2>
        <ClubProfile
          club={preview}
          headingLevel={2}
          photos={<PhotoGallery photos={photos} signedIn={false} reportable={false} />}
          actions={<Button type="button" disabled>{t("club.sendEnquiry")}</Button>}
        />
      </section>
    </div>
  );
}

export function PhotoUploadForm({ clubId, clubName }: { clubId: string; clubName: string }) {
  const t = useTranslations("photos");
  const { state, pending, formProps } = useFormAction(uploadPhotoAction);
  const err = useFieldError(state);
  const [caption, setCaption] = useState("");
  const flagged = captionNameWarning(caption, [clubName]);
  return (
    <form {...formProps} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="clubId" value={clubId} />
      <TextField id="ph-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required label={t("file")} hint={t("fileHint")} error={err("file")} />
      <TextField id="ph-alt" name="altText" required minLength={3} maxLength={200} label={t("alt")} hint={t("altHint")} error={err("altText")} />
      <TextField
        id="ph-caption" name="caption" maxLength={140} value={caption} onChange={(e) => setCaption(e.target.value)}
        label={t("caption")} hint={t("captionHint")} error={err("caption")}
      />
      {flagged.length ? <Notice tone="warning">{t("captionWarning", { words: flagged.join(", ") })}</Notice> : null}
      <Checkbox id="ph-consent" name="consent" required label={t("consent")} error={err("consent")} />
      <FormError state={state} />
      <SuccessNotice state={state} />
      <Button type="submit" disabled={pending}>{t("upload")}</Button>
    </form>
  );
}

export function LicenceForm({ clubId }: { clubId: string }) {
  const t = useTranslations("licence");
  const { state, pending, formProps } = useFormAction(submitLicenceAction);
  const err = useFieldError(state);
  if (state.ok) return <SuccessNotice state={state} />;
  return (
    <form {...formProps} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="clubId" value={clubId} />
      <TextField id="lic-number" name="number" required label={t("number")} error={err("number")} />
      <TextField id="lic-authority" name="issuingAuthority" required label={t("authority")} hint={t("authorityHint")} error={err("issuingAuthority")} />
      <TextField id="lic-expires" name="expiresOn" type="date" required label={t("expires")} error={err("expiresOn")} />
      <TextField id="lic-doc" name="document" type="file" accept="application/pdf,image/jpeg,image/png" required label={t("document")} hint={t("documentHint")} error={err("document")} />
      <FormError state={state} />
      <Button type="submit" disabled={pending}>{t("submit")}</Button>
    </form>
  );
}
