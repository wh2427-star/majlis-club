import { getTranslations } from "next-intl/server";
import { licenceQueue } from "@/lib/services/admin";
import { approveLicenceAction, rejectLicenceAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { PageTitle } from "@/components/ui/Misc";

export const metadata = { title: "Licence checks" };

export default async function LicenceQueue() {
  const [t, queue] = await Promise.all([getTranslations(), licenceQueue()]);
  return (
    <>
      <PageTitle>{t("admin.licences")}</PageTitle>
      {queue.length === 0 ? <p>{t("admin.noLicences")}</p> : null}
      <ul className="flex flex-col gap-3">
        {queue.map((l) => (
          <li key={l.id} className="rounded-card bg-white p-4">
            <p className="font-semibold">{t("admin.licenceLine", { club: l.clubs?.name ?? "", number: l.number, authority: l.issuing_authority })}</p>
            <p className="text-sm">{l.clubs ? t(`clubType.${l.clubs.club_type}`) : ""}</p>
            <p>{l.documentUrl ? <a href={l.documentUrl} target="_blank" rel="noreferrer">{t("admin.viewDocument")}</a> : t("admin.noDocument")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <form action={approveLicenceAction} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={l.id} />
                <TextField id={`exp-${l.id}`} name="expiresOn" type="date" required defaultValue={l.expires_on} label={t("admin.expiry")} />
                <Button type="submit">{t("admin.approve")}</Button>
              </form>
              <form action={rejectLicenceAction} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={l.id} />
                <TextField id={`why-${l.id}`} name="reason" required label={t("admin.rejectReason")} />
                <Button type="submit" variant="danger">{t("admin.reject")}</Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
