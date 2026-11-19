import { getTranslations } from "next-intl/server";
import { getClubPhotos, getSports } from "@/lib/data/queries";
import { requireClubAccess } from "@/lib/services/club";
import { Notice, PageTitle } from "@/components/ui/Misc";
import { ScheduleForm } from "@/components/forms/ScheduleForm";
import { ListingStepper } from "@/components/club/ListingStepper";

export const metadata = { title: "Schedule and fees" };

/** Listing step 2: sessions and prices, with a live preview. */
export default async function SchedulePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const { club } = await requireClubAccess(id, `/club/${id}/edit/schedule`);
  const [t, sports, photos] = await Promise.all([getTranslations(), getSports(), getClubPhotos(id)]);
  const sportId = (slug: string) => sports.find((s) => s.slug === slug)?.id ?? "";
  return (
    <>
      <ListingStepper clubId={club.id} current={2} />
      <PageTitle sub={t("editor.intro")}>{t("wizard.scheduleTitle")}</PageTitle>
      {created ? <div className="mb-4"><Notice tone="success">{t("onboard.created")}</Notice></div> : null}
      <ScheduleForm
        clubId={club.id}
        profile={{
          name: club.name, clubType: club.clubType, areaName: club.areaName, description: club.description, coachCredentials: club.coachCredentials,
          licenceVerified: club.licenceVerified, trialOffer: club.trialOffer, typicalReplyDays: club.typicalReplyDays,
        }}
        sessions={club.sessions.map((s) => ({ sportId: sportId(s.sportSlug), sportSlug: s.sportSlug, day: s.day, start: s.start, end: s.end, ageMin: s.ageMin, ageMax: s.ageMax, priceAed: s.priceAed }))}
        primarySportId={club.primarySportId}
        sports={sports.map((s) => ({ value: s.id, label: t(`sports.${s.slug}`), slug: s.slug }))}
        photos={photos}
      />
    </>
  );
}
