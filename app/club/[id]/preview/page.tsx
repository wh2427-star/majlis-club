import { getTranslations } from "next-intl/server";
import { getClubPhotos } from "@/lib/data/queries";
import { requireClubAccess } from "@/lib/services/club";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageTitle } from "@/components/ui/Misc";
import { ClubProfile } from "@/components/club/ClubProfile";
import { PhotoGallery } from "@/components/club/PhotoGallery";
import { ListingStepper } from "@/components/club/ListingStepper";

export const metadata = { title: "Preview" };

/** Listing step 4: the profile exactly as parents see it. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { club } = await requireClubAccess(id, `/club/${id}/preview`);
  const [t, photos] = await Promise.all([getTranslations(), getClubPhotos(id)]);
  const visible = photos.filter((p) => p.status === "visible");
  return (
    <>
      <ListingStepper clubId={club.id} current={4} />
      <PageTitle sub={t("wizard.previewIntro")}>{t("wizard.previewTitle")}</PageTitle>
      <section className="rounded-card border-2 border-dashed border-ink p-4">
        <ClubProfile
          club={club}
          headingLevel={2}
          photos={visible.length ? <PhotoGallery photos={visible} signedIn={false} reportable={false} /> : null}
          actions={<Button type="button" disabled>{t("club.sendEnquiry")}</Button>}
          trialAction={() => <Button type="button" variant="secondary" disabled>{t("trial.book")}</Button>}
        />
      </section>
      <ButtonLink href={`/club/${club.id}`} className="mt-6">{t("wizard.backToDashboard")}</ButtonLink>
    </>
  );
}
