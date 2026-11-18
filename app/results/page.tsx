import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { searchClubs } from "@/lib/services/search";
import { getAreas, getSports } from "@/lib/data/queries";
import { ClubCard } from "@/components/club/ClubCard";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField } from "@/components/ui/Field";
import { Notice, Section } from "@/components/ui/Misc";
import { SuggestClubForm } from "@/components/forms/PublicForms";
import { SportHeader } from "@/components/brand/SportHeader";

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const t = await getTranslations();
  const area = (await getAreas()).find((a) => a.slug === sp.area);
  return { title: area ? t("results.titleAll", { area: area.name }) : t("home.search") };
}

export default async function ResultsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const outcome = await searchClubs(sp);
  if (outcome.kind === "no-area") redirect("/");
  if (outcome.kind === "coming-soon") redirect(`/areas/${outcome.areaSlug}`);

  const [t, sports] = await Promise.all([getTranslations(), getSports()]);
  const { area, filters, result, nearby } = outcome;
  const sportName = filters.sport ? t(`sports.${filters.sport}`) : null;
  const title = sportName ? t("results.title", { sport: sportName, area: area.name }) : t("results.titleAll", { area: area.name });
  const ages = Array.from({ length: 15 }, (_, i) => i + 3);

  return (
    <>
      {filters.sport ? <SportHeader sport={filters.sport} /> : null}
      <header className="mb-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-1">{t("results.count", { count: result.organic.length })}</p>
      </header>

      <details className="mb-4 rounded-card bg-white p-4">
        <summary className="min-h-tap cursor-pointer content-center font-semibold">{t("results.showFilters")}</summary>
        <form action="/results" method="get" className="mt-3 grid gap-3 sm:grid-cols-2" aria-label={t("results.filters")}>
          <input type="hidden" name="area" value={area.slug} />
          <SelectField
            id="f-sport" name="sport" label={t("home.sportLabel")} defaultValue={filters.sport ?? ""}
            options={[{ value: "", label: t("home.anySport") }, ...sports.map((s) => ({ value: s.slug, label: t(`sports.${s.slug}`) }))]}
          />
          <SelectField
            id="f-age" name="age" label={t("results.childAge")} defaultValue={filters.childAge?.toString() ?? ""}
            options={[{ value: "", label: t("results.anyAge") }, ...ages.map((a) => ({ value: String(a), label: String(a) }))]}
          />
          <SelectField
            id="f-day" name="day" label={t("results.day")} defaultValue={filters.day?.toString() ?? ""}
            options={[{ value: "", label: t("results.anyDay") }, ...[0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`days.long.${d}`) }))]}
          />
          <SelectField
            id="f-price" name="maxPrice" label={t("results.maxPrice")} defaultValue={filters.maxPriceAed?.toString() ?? ""}
            options={[{ value: "", label: t("results.anyPrice") }, ...[30, 50, 75, 100, 125].map((p) => ({ value: String(p), label: `AED ${p}` }))]}
          />
          <SelectField
            id="f-km" name="maxKm" label={t("results.distance")} defaultValue={filters.maxDistanceKm?.toString() ?? ""}
            options={[{ value: "", label: t("results.anyDistance") }, ...[2, 5, 10, 15].map((k) => ({ value: String(k), label: t("results.withinKm", { km: k }) }))]}
          />
          <div className="flex flex-wrap items-end gap-2">
            <Button type="submit">{t("results.apply")}</Button>
            <ButtonLink href={`/results?area=${area.slug}`} variant="quiet">{t("results.clear")}</ButtonLink>
          </div>
        </form>
      </details>

      {result.featured.length ? (
        <section aria-labelledby="featured-title" className="mb-6" data-testid="featured-slot">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 id="featured-title">
              <Badge kind="featured">{t("results.featuredTitle")}</Badge>
            </h2>
            <p className="text-sm">{t("results.featuredNote")}</p>
          </div>
          {result.featured.map((c) => (
            <ClubCard key={c.id} club={c} areaSlug={area.slug} featured />
          ))}
        </section>
      ) : null}

      {result.organic.length ? (
        <section aria-labelledby="list-title">
          <h2 id="list-title" className="text-xl font-semibold">{t("results.listTitle")}</h2>
          <p className="mb-3 text-sm">{t("results.order", { area: area.name })}</p>
          <ol className="flex flex-col gap-3" data-testid="organic-list">
            {result.organic.map((c) => (
              <li key={c.id}>
                <ClubCard club={c} areaSlug={area.slug} />
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section aria-labelledby="empty-title" data-testid="empty-state">
          <Notice tone="info">
            <h2 id="empty-title" className="font-semibold">{t("results.emptyTitle")}</h2>
            <p>{t("results.emptyBody", { area: area.name })}</p>
          </Notice>
          {nearby.length ? (
            <Section title={t("results.nearbyTitle")} id="nearby-title">
              <ul className="flex flex-col gap-3">
                {nearby.map((c) => (
                  <li key={c.id}><ClubCard club={c} areaSlug={area.slug} /></li>
                ))}
              </ul>
            </Section>
          ) : null}
        </section>
      )}

      <Section title={t("results.suggestTitle")} id="suggest-title">
        <Card>
          <p className="mb-3">{t("results.suggestBody")}</p>
          <SuggestClubForm areaId={area.id} />
        </Card>
      </Section>
    </>
  );
}
