import { getTranslations } from "next-intl/server";
import { getAreas, getClubPhotos, getSports } from "@/lib/data/queries";
import { requireClubAccess } from "@/lib/services/club";
import { Notice, PageTitle } from "@/components/ui/Misc";
import { ScheduleForm } from "@/components/forms/ScheduleForm";
import { toEditorPlan, type EditorVenue } from "@/components/forms/schedule-editor";
import { ListingStepper } from "@/components/club/ListingStepper";

export const metadata = { title: "Schedule and fees" };

/** Listing step 2: venues, age groups, times and prices, with a live preview. */
export default async function SchedulePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const { club } = await requireClubAccess(id, `/club/${id}/edit/schedule`);
  const [t, sports, photos, areas] = await Promise.all([getTranslations(), getSports(), getClubPhotos(id), getAreas()]);
  const sportId = (slug: string) => sports.find((s) => s.slug === slug)?.id ?? "";
  const venues: EditorVenue[] = club.venues.map((v) => ({
    name: v.name,
    areaId: v.areaId,
    lat: v.lat,
    lng: v.lng,
    groups: club.groups
      .filter((g) => g.venueId === v.id)
      .map((g) => ({
        name: g.name,
        ageMin: g.ageMin,
        ageMax: g.ageMax,
        sessions: club.sessions
          .filter((s) => s.groupId === g.id)
          .map((s) => ({ sportId: sportId(s.sportSlug), sportSlug: s.sportSlug, day: s.day, start: s.start, end: s.end, trialAvailable: s.trialAvailable })),
        plans: g.plans.map(toEditorPlan),
      })),
  }));
  // A new club starts with one venue in its own area and one empty group.
  if (venues.length === 0) {
    venues.push({ name: club.areaName, areaId: club.areaId, lat: club.lat, lng: club.lng, groups: [{ name: "", ageMin: 6, ageMax: 12, sessions: [], plans: [] }] });
  }
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
        venues={venues}
        plans={club.pricePlans.map(toEditorPlan)}
        primarySportId={club.primarySportId}
        sports={sports.map((s) => ({ value: s.id, label: t(`sports.${s.slug}`), slug: s.slug }))}
        areas={areas.map((a) => ({ value: a.id, label: a.name, lat: a.lat, lng: a.lng }))}
        photos={photos}
      />
    </>
  );
}
