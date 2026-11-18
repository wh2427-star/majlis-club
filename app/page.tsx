import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAreas, getSports } from "@/lib/data/queries";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Section } from "@/components/ui/Misc";
import { Illustration } from "@/components/brand/Illustration";
import { createIllustrationPicker, isIllustrationSport } from "@/lib/illustrations";
import { DotsDivide } from "@/components/brand/DotsDivide";
import { appConfig } from "@/config/app";

export default async function Home() {
  const [t, areas, sports] = await Promise.all([getTranslations(), getAreas(), getSports()]);
  const live = areas.filter((a) => a.status === "live");
  const soon = areas.filter((a) => a.status === "coming_soon");
  const pickArt = createIllustrationPicker("home-sports");

  return (
    <>
      <header className="mb-4">
        {/* App launch: runs once per browser session, skipped under reduced motion. */}
        <DotsDivide label={appConfig.name} size={64} onceKey="launch" />
        <h1 className="text-3xl font-semibold">{t("home.title")}</h1>
        <p className="mt-2">{t("home.intro")}</p>
      </header>

      <Card>
        <form action="/results" method="get" className="flex flex-col gap-4">
          <fieldset>
            <legend className="font-semibold">{t("home.areaLabel")}</legend>
            <p className="text-sm">{t("home.areaHint")}</p>
            <div className="mt-2 flex flex-col gap-1">
              {live.map((a, i) => (
                <label key={a.id} className="flex min-h-tap items-center gap-3">
                  <input type="radio" name="area" value={a.slug} defaultChecked={i === 0} className="size-6 accent-emerald" required />
                  <span>{a.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1">
            <label htmlFor="home-sport" className="font-semibold">{t("home.sportLabel")}</label>
            <select id="home-sport" name="sport" className="min-h-tap rounded-control border-2 border-ink bg-white px-3">
              <option value="">{t("home.anySport")}</option>
              {sports.map((s) => (
                <option key={s.slug} value={s.slug}>{t(`sports.${s.slug}`)}</option>
              ))}
            </select>
          </div>
          <Button type="submit">{t("home.search")}</Button>
        </form>
      </Card>

      <Section title={t("home.comingSoonTitle")} id="coming-soon">
        <p>{t("home.comingSoonIntro")}</p>
        <ul className="mt-2 flex flex-col gap-2">
          {soon.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2">
              <Badge kind="status" icon="hourglass">{t("common.comingSoon")}</Badge>
              <Link href={`/areas/${a.slug}`} className="underline underline-offset-4">
                {t("home.joinWaitlist", { area: a.name })}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t("home.sportsTitle")} id="sports">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sports.map((s) => (
            <li key={s.slug}>
              <Link href={`/results?area=${live[0]?.slug ?? ""}&sport=${s.slug}`} className="block rounded-card bg-white p-2 hover:outline-2">
                {/* Decorative: the sport name below is the link text. */}
                {isIllustrationSport(s.slug) ? <Illustration art={pickArt(s.slug)} size="sm" decorative /> : null}
                <span className="mt-1 block font-semibold">{t(`sports.${s.slug}`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t("home.clubPrompt")} id="clubs">
        <ButtonLink href="/club/new" variant="secondary">{t("clubArea.addButton")}</ButtonLink>
      </Section>
    </>
  );
}
