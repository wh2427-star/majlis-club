import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAreas, getClubBySlug, getClubPhotos, getCurrentUser } from "@/lib/data/queries";
import { isSaved, recordView } from "@/lib/services/public-actions";
import { haversineKm, roundedKm } from "@/lib/domain/distance";
import { ClubProfile } from "@/components/club/ClubProfile";
import { PhotoGallery } from "@/components/club/PhotoGallery";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Misc";
import { SaveClubButton } from "@/components/forms/PublicForms";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ area?: string }> };

export async function generateMetadata({ params }: Props) {
  const club = await getClubBySlug((await params).slug);
  return { title: club?.name };
}

export default async function ClubPage({ params, searchParams }: Props) {
  const [{ slug }, { area: areaSlug }] = await Promise.all([params, searchParams]);
  const club = await getClubBySlug(slug);
  if (!club) notFound();
  const [t, user, photos, areas] = await Promise.all([getTranslations(), getCurrentUser(), getClubPhotos(club.id), getAreas()]);
  const area = areas.find((a) => a.slug === areaSlug && a.status === "live");
  const distanceKm = area ? roundedKm(haversineKm(area, club)) : undefined;
  if (club.status === "approved") await recordView(club.id);
  const saved = user ? await isSaved(club.id) : false;

  const actions =
    club.status !== "approved" ? (
      <Notice tone="warning">{club.status === "pending" ? t("club.pending") : t("club.rejected")}</Notice>
    ) : user ? (
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/enquire/${club.slug}`}>{t("club.sendEnquiry")}</ButtonLink>
        <SaveClubButton clubId={club.id} saved={saved} />
      </div>
    ) : (
      <div className="flex flex-col gap-2">
        <ButtonLink href={`/auth/sign-in?next=/enquire/${club.slug}`}>{t("club.sendEnquiry")}</ButtonLink>
        <p className="text-sm">{t("club.signInToEnquire")}</p>
      </div>
    );

  return (
    <ClubProfile
      club={club}
      distanceKm={distanceKm}
      photos={<PhotoGallery photos={photos} signedIn={!!user} />}
      actions={actions}
    />
  );
}
