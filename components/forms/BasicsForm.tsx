"use client";
import { useTranslations } from "next-intl";
import { createClubAction, updateBasicsAction } from "@/app/actions/club";
import { Button } from "@/components/ui/Button";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { ageGroupValues } from "@/lib/schemas";
import { FormError, useFieldError, useFormAction } from "./PublicForms";

type Opt = { value: string; label: string };
export type BasicsValues = {
  name: string; sportId: string; areaId: string; clubType: "academy" | "community"; ageGroups: string[];
  description: string; coachCredentials: string; typicalReplyDays: number;
};

/** Listing step 1. Creates the club when there is no clubId yet. */
export function BasicsForm({ clubId, values, areas, sports }: { clubId?: string; values?: BasicsValues; areas: Opt[]; sports: Opt[] }) {
  const t = useTranslations();
  const { state, pending, formProps } = useFormAction(clubId ? updateBasicsAction : createClubAction);
  const err = useFieldError(state);
  return (
    <form {...formProps} className="flex flex-col gap-4" noValidate>
      {clubId ? <input type="hidden" name="clubId" value={clubId} /> : null}
      <TextField id="b-name" name="name" required defaultValue={values?.name} placeholder={t("wizard.namePlaceholder")} label={t("wizard.name")} error={err("name")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id="b-sport" name="sportId" defaultValue={values?.sportId} label={t("wizard.sport")} options={sports} error={err("sportId")} />
        <SelectField id="b-area" name="areaId" defaultValue={values?.areaId} label={t("wizard.community")} options={areas} error={err("areaId")} />
      </div>
      <SelectField
        id="b-type" name="clubType" defaultValue={values?.clubType ?? "academy"} label={t("wizard.clubType")} hint={t("onboard.typeHint")}
        options={[{ value: "academy", label: t("clubType.academy") }, { value: "community", label: t("clubType.community") }]}
      />
      <fieldset aria-describedby={err("ageGroups") ? "b-ages-error" : undefined}>
        <legend className="font-semibold">{t("wizard.ageGroups")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ageGroupValues.map((g) => (
            <label
              key={g}
              className="inline-flex min-h-tap cursor-pointer items-center rounded-full border-2 border-ink bg-white px-4 has-checked:bg-emerald has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-ink"
            >
              <input type="checkbox" name="ageGroups" value={g} defaultChecked={values?.ageGroups.includes(g)} className="sr-only" />
              {t("wizard.ageGroup", { group: g })}
            </label>
          ))}
        </div>
        {err("ageGroups") ? <p id="b-ages-error" className="mt-1 text-sm font-semibold text-berry" role="alert">{err("ageGroups")}</p> : null}
      </fieldset>
      <TextArea
        id="b-desc" name="description" defaultValue={values?.description} maxLength={1500} placeholder={t("wizard.descriptionPlaceholder")}
        label={t("wizard.description")} error={err("description")}
      />
      <TextField
        id="b-coach" name="coachCredentials" defaultValue={values?.coachCredentials} maxLength={200} placeholder={t("wizard.coachPlaceholder")}
        label={t("wizard.coachCredentials")} error={err("coachCredentials")}
      />
      <TextField
        id="b-reply" name="typicalReplyDays" type="number" min={1} max={14} defaultValue={values?.typicalReplyDays ?? 3} label={t("editor.replyDays")}
        error={err("typicalReplyDays")}
      />
      <FormError state={state} />
      <Button type="submit" disabled={pending}>{t("wizard.continueSchedule")}</Button>
    </form>
  );
}
