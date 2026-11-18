import { getFormatter, getTranslations } from "next-intl/server";
import { requireClubAccess, getLicenceStatus } from "@/lib/services/club";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageTitle, Section } from "@/components/ui/Misc";
import { LicenceForm } from "@/components/forms/ClubForms";
import type { IconName } from "@/components/ui/Icon";

export const metadata = { title: "Licence" };

const icons: Record<string, IconName> = { none: "info", pending: "hourglass", verified: "check", expired: "alert", rejected: "x" };

export default async function LicencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { club } = await requireClubAccess(id, `/club/${id}/licence`);
  const [t, format, status] = await Promise.all([getTranslations("licence"), getFormatter(), getLicenceStatus(id)]);
  const label =
    status.state === "verified"
      ? t("states.verified", { date: format.dateTime(new Date(status.verifiedUntil!), { day: "numeric", month: "long", year: "numeric" }) })
      : status.state === "rejected"
        ? t("states.rejected", { reason: status.rejectReason })
        : t(`states.${status.state}`);
  return (
    <>
      <PageTitle sub={t("intro")}>{t("title", { name: club.name })}</PageTitle>
      <Section title={t("current")} id="current">
        <Badge kind={status.state === "verified" ? "licence" : "status"} icon={icons[status.state]}>{label}</Badge>
      </Section>
      {status.state !== "pending" ? (
        <Section title={t("submit")} id="submit">
          <Card><LicenceForm clubId={club.id} /></Card>
        </Section>
      ) : null}
    </>
  );
}
