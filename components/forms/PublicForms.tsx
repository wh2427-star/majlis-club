"use client";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { joinWaitlistAction, reportPhotoAction, suggestClubAction, toggleSaveAction } from "@/app/actions/public";
import { Button } from "@/components/ui/Button";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import type { ActionState } from "@/lib/services/public-actions";

const initial: ActionState = { ok: false };

export function FormError({ state }: { state: ActionState }) {
  const t = useTranslations();
  if (!state.message || state.ok) return null;
  return <Notice tone="warning">{t(state.message)}</Notice>;
}

/**
 * Like useActionState, but the form keeps what the user typed when the server returns errors.
 * (React resets a form after a form action; we submit through onSubmit instead.)
 * The form still has `action` so it works before JavaScript loads.
 */
export function useFormAction(fn: (state: ActionState, form: FormData) => Promise<ActionState>, resetOnSuccess = false) {
  const [state, dispatch, pending] = useActionState(fn, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };
  return { state, pending, formProps: { action: dispatch, onSubmit, ref } };
}

export function useFieldError(state: ActionState) {
  const t = useTranslations();
  return (name: string) => (state.errors?.[name] ? t(state.errors[name]) : undefined);
}

export function WaitlistForm({ areaId, areaName }: { areaId: string; areaName: string }) {
  const t = useTranslations("waitlist");
  const { state, pending, formProps } = useFormAction(joinWaitlistAction);
  const err = useFieldError(state);
  if (state.ok) return <Notice tone="success">{t("joined", { area: areaName })}</Notice>;
  return (
    <form {...formProps} className="flex flex-col gap-3">
      <input type="hidden" name="areaId" value={areaId} />
      <TextField id="waitlist-email" name="email" type="email" autoComplete="email" required label={t("email")} error={err("email")} />
      <FormError state={state} />
      <Button type="submit" disabled={pending}>{t("join")}</Button>
    </form>
  );
}

export function SuggestClubForm({ areaId }: { areaId?: string }) {
  const t = useTranslations("results");
  const { state, pending, formProps } = useFormAction(suggestClubAction);
  const err = useFieldError(state);
  if (state.ok) return <Notice tone="success">{t("suggestThanks")}</Notice>;
  return (
    <form {...formProps} className="flex flex-col gap-3">
      {areaId ? <input type="hidden" name="areaId" value={areaId} /> : null}
      <TextField id="suggest-name" name="clubName" required label={t("suggestName")} error={err("clubName")} />
      <TextArea id="suggest-note" name="note" label={t("suggestNote")} rows={2} />
      <FormError state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>{t("suggestSend")}</Button>
    </form>
  );
}

export function ReportPhotoForm({ photoId, signedIn }: { photoId: string; signedIn: boolean }) {
  const t = useTranslations("club");
  const [open, setOpen] = useState(false);
  const { state, pending, formProps } = useFormAction(reportPhotoAction);
  if (state.ok) return <Notice tone="success">{t("reportSent")}</Notice>;
  if (!open)
    return (
      <Button type="button" variant="quiet" className="px-0" onClick={() => setOpen(true)} aria-expanded={false}>
        {t("reportPhoto")}
      </Button>
    );
  if (!signedIn)
    return (
      <p>
        <a href="/auth/sign-in" className="underline">{t("reportSignIn")}</a>
      </p>
    );
  const reasons = ["child_named_in_caption", "no_consent", "inappropriate", "other"] as const;
  return (
    <form {...formProps} className="mt-2 flex flex-col gap-3 rounded-card border-2 border-ink p-3" aria-label={t("reportTitle")}>
      <input type="hidden" name="photoId" value={photoId} />
      <SelectField
        id={`reason-${photoId}`}
        name="reason"
        label={t("reportReason")}
        options={reasons.map((r) => ({ value: r, label: t(`reasons.${r}`) }))}
      />
      <TextArea id={`note-${photoId}`} name="note" rows={2} label={t("reportNote")} />
      <FormError state={state} />
      <Button type="submit" variant="danger" disabled={pending}>{t("reportSend")}</Button>
    </form>
  );
}

export function SaveClubButton({ clubId, saved }: { clubId: string; saved: boolean }) {
  const t = useTranslations("club");
  const { state, pending, formProps } = useFormAction(toggleSaveAction);
  return (
    <form {...formProps}>
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="save" value={saved ? "0" : "1"} />
      <Button type="submit" variant="secondary" disabled={pending} aria-pressed={saved}>
        {saved ? t("unsave") : t("saveClub")}
      </Button>
      <FormError state={state} />
    </form>
  );
}
