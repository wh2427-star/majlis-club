import { getTranslations } from "next-intl/server";
import { getClubPhotos } from "@/lib/data/queries";
import { requireClubAccess } from "@/lib/services/club";
import { deletePhotoAction } from "@/app/actions/club";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice, PageTitle, Section } from "@/components/ui/Misc";
import { PhotoUploadForm } from "@/components/forms/ClubForms";

export const metadata = { title: "Photos" };

export default async function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { club } = await requireClubAccess(id, `/club/${id}/photos`);
  const [t, tc, photos] = await Promise.all([getTranslations("photos"), getTranslations("common"), getClubPhotos(id)]);
  const statusLabel = { visible: t("statusVisible"), under_review: t("statusUnderReview"), removed: t("statusRemoved") } as Record<string, string>;
  return (
    <>
      <PageTitle>{t("title", { name: club.name })}</PageTitle>
      <Notice>{t("rules")}</Notice>
      <Section title={t("upload")} id="upload">
        <Card><PhotoUploadForm clubId={club.id} clubName={club.name} /></Card>
      </Section>
      <Section title={t("title", { name: club.name })} id="list">
        {photos.length === 0 ? <p>{t("none")}</p> : null}
        <ul className="grid gap-3 sm:grid-cols-2">
          {photos.map((p) => (
            <li key={p.id} className="rounded-card bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.altText} className="aspect-[4/3] w-full rounded-control object-cover" />
              {p.caption ? <p className="mt-1 text-sm">{p.caption}</p> : null}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <Badge kind={p.status === "visible" ? "status" : "warning"} icon={p.status === "visible" ? "check" : "alert"}>{statusLabel[p.status]}</Badge>
                <form action={deletePhotoAction}>
                  <input type="hidden" name="clubId" value={club.id} />
                  <input type="hidden" name="photoId" value={p.id} />
                  <Button type="submit" variant="quiet">{tc("remove")}</Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
