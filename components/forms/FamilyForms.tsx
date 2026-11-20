"use client";
import { useTranslations } from "next-intl";
import { addChildAction, requestTrialAction, sendEnquiryAction } from "@/app/actions/family";
import { Button } from "@/components/ui/Button";
import { Checkbox, SelectField, TextArea, TextField } from "@/components/ui/Field";
import { FormError, useFieldError, useFormAction } from "./PublicForms";


export function EnquiryForm({
  club,
  contact,
  kids,
  sports,
}: {
  club: { id: string; name: string };
  contact: { name: string; email: string; phone: string };
  kids: { id: string; label: string }[];
  sports: { id: string; label: string }[];
}) {
  const t = useTranslations();
  const { state, pending, formProps } = useFormAction(sendEnquiryAction);
  const err = useFieldError(state);
  return (
    <form {...formProps} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="clubId" value={club.id} />
      <TextField id="enq-name" name="contactName" autoComplete="name" required defaultValue={contact.name} label={t("enquiry.name")} error={err("contactName")} />
      <TextField id="enq-email" name="contactEmail" type="email" autoComplete="email" required defaultValue={contact.email} label={t("enquiry.email")} error={err("contactEmail")} />
      <TextField id="enq-phone" name="contactPhone" type="tel" autoComplete="tel" defaultValue={contact.phone} label={`${t("enquiry.phone")} (${t("common.optional")})`} />
      <SelectField
        id="enq-child" name="childId" label={t("enquiry.child")}
        hint={kids.length ? undefined : t("enquiry.addChildHint")}
        options={[...kids.map((k) => ({ value: k.id, label: k.label })), { value: "", label: t("enquiry.noChild") }]}
      />
      {sports.length > 1 ? (
        <SelectField id="enq-sport" name="sportId" label={t("enquiry.sport")} options={sports.map((s) => ({ value: s.id, label: s.label }))} />
      ) : sports[0] ? (
        <input type="hidden" name="sportId" value={sports[0].id} />
      ) : null}
      <TextArea id="enq-message" name="message" label={t("enquiry.message")} hint={t("enquiry.messageHint")} error={err("message")} rows={3} />
      <Checkbox id="enq-consent" name="consent" required label={t("enquiry.consent", { club: club.name })} error={err("consent")} />
      <FormError state={state} />
      <Button type="submit" disabled={pending}>{t("enquiry.send")}</Button>
    </form>
  );
}

/** Ask a club for a free trial of one session. No payment; the club accepts or declines. */
export function TrialForm({
  club,
  sessions,
  selected,
  contact,
  kids,
  minDate,
  maxDate,
}: {
  club: { id: string; name: string };
  sessions: { id: string; label: string }[];
  selected: string;
  contact: { name: string; email: string };
  kids: { id: string; label: string }[];
  minDate: string;
  maxDate: string;
}) {
  const t = useTranslations();
  const { state, pending, formProps } = useFormAction(requestTrialAction);
  const err = useFieldError(state);
  const year = new Date().getFullYear();
  return (
    <form {...formProps} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="clubId" value={club.id} />
      <fieldset className="flex flex-col gap-1" aria-describedby={err("sessionId") ? "trial-session-error" : undefined}>
        <legend className="mb-1 font-semibold">{t("trial.session")}</legend>
        {sessions.map((s) => (
          <label key={s.id} className="flex min-h-tap items-center gap-3">
            <input type="radio" name="sessionId" value={s.id} defaultChecked={s.id === selected} className="size-6 shrink-0 accent-emerald" />
            <span>{s.label}</span>
          </label>
        ))}
        {err("sessionId") ? <p id="trial-session-error" role="alert" className="text-sm font-semibold text-berry">{err("sessionId")}</p> : null}
      </fieldset>
      {kids.length ? (
        <SelectField id="trial-child" name="childId" label={t("trial.child")} options={kids.map((k) => ({ value: k.id, label: k.label }))} error={err("childId")} />
      ) : (
        <>
          <TextField id="trial-nickname" name="childNickname" required maxLength={30} label={t("family.nickname")} hint={t("family.nicknameHint")} error={err("childNickname")} />
          <TextField id="trial-year" name="childBirthYear" type="number" inputMode="numeric" required min={year - 18} max={year - 2} label={t("family.birthYear")} error={err("childBirthYear")} />
        </>
      )}
      <TextField id="trial-date" name="preferredDate" type="date" required min={minDate} max={maxDate} label={t("trial.date")} hint={t("trial.dateHint")} error={err("preferredDate")} />
      <TextField id="trial-name" name="contactName" autoComplete="name" required defaultValue={contact.name} label={t("enquiry.name")} error={err("contactName")} />
      <TextField id="trial-email" name="contactEmail" type="email" autoComplete="email" required defaultValue={contact.email} label={t("enquiry.email")} error={err("contactEmail")} />
      <Checkbox id="trial-consent" name="consent" required label={t("trial.consent", { club: club.name })} error={err("consent")} />
      <FormError state={state} />
      <Button type="submit" disabled={pending}>{t("trial.submit")}</Button>
    </form>
  );
}

export function AddChildForm() {
  const t = useTranslations("family");
  const { state, pending, formProps } = useFormAction(addChildAction, true);
  const err = useFieldError(state);
  const year = new Date().getFullYear();
  return (
    <form {...formProps} className="flex flex-col gap-3" aria-label={t("addChild")}>
      <TextField id="child-nick" name="nickname" required maxLength={30} label={t("nickname")} hint={t("nicknameHint")} error={err("nickname")} />
      <TextField
        id="child-year" name="birthYear" type="number" inputMode="numeric" required min={year - 18} max={year - 2}
        label={t("birthYear")} error={err("birthYear")} className="tabular block w-full min-h-tap rounded-control border-2 border-ink bg-white px-3 py-2"
      />
      <FormError state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>{t("addChild")}</Button>
    </form>
  );
}
