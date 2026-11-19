import { getTranslations } from "next-intl/server";
import { requireClubAccess } from "@/lib/services/club";
import { PageTitle } from "@/components/ui/Misc";

export const metadata = { title: "Club dashboard" };

export default async function ClubDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { club } = await requireClubAccess(id, `/club/${id}`);
  const t = await getTranslations("dashboard");
  return <PageTitle sub={t("intro", { name: club.name })}>{t("title")}</PageTitle>;
}
