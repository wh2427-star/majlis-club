import { getTranslations } from "next-intl/server";
import { reportQueue } from "@/lib/services/admin";
import { resolveReportAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { PageTitle } from "@/components/ui/Misc";

export const metadata = { title: "Reported photos" };

export default async function PhotoQueue() {
  const [t, queue] = await Promise.all([getTranslations(), reportQueue()]);
  return (
    <>
      <PageTitle>{t("admin.photos")}</PageTitle>
      {queue.length === 0 ? <p>{t("admin.noReports")}</p> : null}
      <ul className="flex flex-col gap-3">
        {queue.map((r) => (
          <li key={r.id} className="rounded-card bg-white p-4">
            <p className="font-semibold">{t("admin.reportLine", { club: r.club_photos?.clubs?.name ?? "", reason: t(`club.reasons.${r.reason}`) })}</p>
            {r.note ? <p>{r.note}</p> : null}
            {r.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photoUrl} alt={r.club_photos?.alt_text ?? ""} className="mt-2 aspect-[4/3] w-full max-w-sm rounded-control object-cover" />
            ) : null}
            {r.club_photos?.caption ? <p className="mt-1 text-sm">{r.club_photos.caption}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {(["upheld", "dismissed"] as const).map((o) => (
                <form key={o} action={resolveReportAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="outcome" value={o} />
                  <Button type="submit" variant={o === "upheld" ? "danger" : "secondary"}>{t(o === "upheld" ? "admin.remove" : "admin.restore")}</Button>
                </form>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
