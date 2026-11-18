import { getTranslations } from "next-intl/server";
import { getAreas, getClubPhotos, getSports } from "@/lib/data/queries";
import { requireClubAccess } from "@/lib/services/club";
import { Notice, PageTitle } from "@/components/ui/Misc";
import { ListingEditor } from "@/components/forms/ClubForms";

export const metadata = { title: "Edit listing" };

export default async function EditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const { club } = await requireClubAccess(id, `/club/${id}/edit`);
  const [t, areas, sports, photos] = await Promise.all([getTranslations(), getAreas(), getSports(), getClubPhotos(id)]);
  const sportId = (slug: string) => sports.find((s) => s.slug === slug)?.id ?? "";
  return (
    <>
      <PageTitle sub={t("editor.intro")}>{t("editor.title", { name: club.name })}</PageTitle>
      {created ? <div className="mb-4"><Notice tone="success">{t("onboard.created")}</Notice></div> : null}
      {club.status === "pending" && !created ? <div className="mb-4"><Notice tone="warning">{t("club.pending")}</Notice></div> : null}
      <ListingEditor
        club={{
          id: club.id, name: club.name, clubType: club.clubType, areaId: club.areaId, description: club.description,
          typicalReplyDays: club.typicalReplyDays, licenceVerified: club.licenceVerified, trialOffer: club.trialOffer,
          sessions: club.sessions.map((s) => ({ sportId: sportId(s.sportSlug), sportSlug: s.sportSlug, day: s.day, start: s.start, end: s.end, ageMin: s.ageMin, ageMax: s.ageMax, priceAed: s.priceAed })),
        }}
        areas={areas.map((a) => ({ value: a.id, label: a.name, name: a.name }))}
        sports={sports.map((s) => ({ value: s.id, label: t(`sports.${s.slug}`), slug: s.slug }))}
        photos={photos}
      />
    </>
  );
}
