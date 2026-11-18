import { useTranslations } from "next-intl";
import type { ClubPhoto } from "@/lib/data/queries";
import { ReportPhotoForm } from "@/components/forms/PublicForms";

export function PhotoGallery({ photos, signedIn, reportable = true }: { photos: ClubPhoto[]; signedIn: boolean; reportable?: boolean }) {
  const t = useTranslations("club");
  const visible = photos.filter((p) => p.status === "visible");
  if (!visible.length) return <p>{t("noPhotos")}</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {visible.map((p) => (
        <li key={p.id} className="rounded-card bg-white p-2">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs, short-lived */}
            <img src={p.url} alt={p.altText} className="aspect-[4/3] w-full rounded-control object-cover" />
            {p.caption ? <figcaption className="mt-1 text-sm">{p.caption}</figcaption> : null}
          </figure>
          {reportable ? <ReportPhotoForm photoId={p.id} signedIn={signedIn} /> : null}
        </li>
      ))}
    </ul>
  );
}
