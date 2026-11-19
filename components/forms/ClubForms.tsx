"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { claimClubAction, submitLicenceAction, uploadPhotoAction } from "@/app/actions/club";
import { Button } from "@/components/ui/Button";
import { Checkbox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { captionNameWarning } from "@/lib/domain/rules";
import type { ActionState } from "@/lib/services/public-actions";
import { licenceSchema, photoSchema } from "@/lib/schemas";
import { withDirectUpload } from "./directUpload";
import { FormError, useFieldError, useFormAction } from "./PublicForms";

function SuccessNotice({ state }: { state: ActionState }) {
  const t = useTranslations();
  return state.ok && state.message ? <Notice tone="success">{t(state.message)}</Notice> : null;
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

const uploadPhoto = withDirectUpload("photo", "file", photoSchema, uploadPhotoAction);
const submitLicence = withDirectUpload("licence", "document", licenceSchema, submitLicenceAction);

export function PhotoUploadForm({ clubId, clubName }: { clubId: string; clubName: string }) {
  const t = useTranslations("photos");
  const { state, pending, formProps } = useFormAction(uploadPhoto);
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
  const { state, pending, formProps } = useFormAction(submitLicence);
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
