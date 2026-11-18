import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAreas } from "@/lib/data/queries";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WaitlistForm } from "@/components/forms/PublicForms";
import { Illustration } from "@/components/brand/Illustration";
import { getAnyIllustration } from "@/lib/illustrations";

/** Rule 4: an unopened area shows "coming soon" and a waitlist, never an empty list. */
export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [t, areas] = await Promise.all([getTranslations(), getAreas()]);
  const area = areas.find((a) => a.slug === slug);
  if (!area) notFound();
  if (area.status === "live") redirect(`/results?area=${area.slug}`);
  const live = areas.filter((a) => a.status === "live").map((a) => a.name);
  return (
    <>
      <Badge kind="status" icon="hourglass">{t("common.comingSoon")}</Badge>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{t("waitlist.title", { area: area.name })}</h1>
      <Illustration art={getAnyIllustration(`waitlist:${area.id}`)} size="md" priority className="mt-3" />
      <p className="mt-2">{t("waitlist.body", { area: area.name })}</p>
      <p className="mt-2">{t("waitlist.liveAreas", { areas: new Intl.ListFormat("en", { type: "conjunction" }).format(live) })}</p>
      <Card className="mt-4">
        <WaitlistForm areaId={area.id} areaName={area.name} />
      </Card>
    </>
  );
}
