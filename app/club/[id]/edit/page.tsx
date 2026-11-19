import { getTranslations } from "next-intl/server";
import { getAreas, getSports } from "@/lib/data/queries";
import { requireClubAccess } from "@/lib/services/club";
import { Card } from "@/components/ui/Card";
import { Notice, PageTitle } from "@/components/ui/Misc";
import { BasicsForm } from "@/components/forms/BasicsForm";
import { ListingStepper } from "@/components/club/ListingStepper";

export const metadata = { title: "Edit listing" };

/** Listing step 1: basics. */
export default async function EditBasicsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { club } = await requireClubAccess(id, `/club/${id}/edit`);
  const [t, areas, sports] = await Promise.all([getTranslations(), getAreas(), getSports()]);
  const sportId = club.primarySportId ?? sports.find((s) => s.slug === club.sports[0])?.id ?? "";
  return (
    <>
      <ListingStepper clubId={club.id} current={1} />
      <PageTitle sub={t("editor.intro")}>{t("editor.title", { name: club.name })}</PageTitle>
      {club.status === "pending" ? <div className="mb-4"><Notice tone="warning">{t("club.pending")}</Notice></div> : null}
      <Card>
        <BasicsForm
          clubId={club.id}
          values={{
            name: club.name, sportId, areaId: club.areaId, clubType: club.clubType, ageGroups: club.ageGroups,
            description: club.description, coachCredentials: club.coachCredentials, typicalReplyDays: club.typicalReplyDays,
          }}
          areas={areas.map((a) => ({ value: a.id, label: a.name }))}
          sports={sports.map((s) => ({ value: s.id, label: t(`sports.${s.slug}`) }))}
        />
      </Card>
    </>
  );
}
