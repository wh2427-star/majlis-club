import { getTranslations } from "next-intl/server";
import { colours, type ColourName } from "@/lib/design/tokens";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Checkbox, TextField } from "@/components/ui/Field";
import { Notice, NumberStat, PageTitle, Section } from "@/components/ui/Misc";
import { LogoMark, Logo } from "@/components/brand/Logo";
import { SportIllustration } from "@/components/brand/illustrations/SportIllustration";

const SPORTS = ["football", "rugby", "basketball", "cricket", "swimming", "netball", "tennis", "gymnastics", "martial-arts"];

export default async function StyleguidePage() {
  const t = await getTranslations("styleguide");
  return (
    <>
      <PageTitle sub={t("intro")}>{t("title")}</PageTitle>

      <Section title={t("colours")} id="sg-colours">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(colours) as ColourName[]).map((c) => (
            <li key={c} className="rounded-card bg-white p-2">
              <span className="block h-12 rounded-control border border-ink" style={{ background: colours[c] }} />
              <span className="tabular mt-1 block text-sm">
                {c} {colours[c]}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t("buttons")} id="sg-buttons">
        <div className="flex flex-wrap gap-2">
          <Button>{t("primary")}</Button>
          <Button variant="secondary">{t("secondary")}</Button>
          <Button variant="quiet">{t("quiet")}</Button>
          <Button variant="danger">{t("danger")}</Button>
        </div>
      </Section>

      <Section title={t("badges")} id="sg-badges">
        <div className="flex flex-wrap gap-2">
          <Badge kind="licence">{t("licence")}</Badge>
          <Badge kind="trial">{t("trial")}</Badge>
          <Badge kind="featured">{t("featured")}</Badge>
        </div>
        <div className="mt-3">
          <Notice>{t("noticeInfo")}</Notice>
        </div>
      </Section>

      <Section title={t("forms")} id="sg-forms">
        <Card className="flex flex-col gap-4">
          <TextField id="sg-nick" label={t("fieldLabel")} hint={t("fieldHint")} />
          <TextField id="sg-nick-err" label={t("fieldLabel")} error={t("fieldError")} />
          <Checkbox id="sg-consent" label={t("checkbox")} />
        </Card>
      </Section>

      <Section title={t("numbers")} id="sg-numbers">
        <Card className="flex gap-8">
          <NumberStat value={128} label={t("views")} />
          <NumberStat value={0} label={t("enquiries")} />
        </Card>
      </Section>

      <Section title={t("logo")} id="sg-logo">
        <div className="flex flex-wrap items-center gap-4">
          <Card>
            <Logo />
          </Card>
          <div className="rounded-card bg-ink p-4">
            <Logo variant="reversed" />
          </div>
          <Card className="text-ink">
            <LogoMark variant="small" size={24} />
          </Card>
        </div>
      </Section>

      <Section title={t("illustrations")} id="sg-ill">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SPORTS.map((s) => (
            <li key={s}>
              <SportIllustration sport={s} alt={t("illustrationAlt", { sport: s })} className="w-full rounded-card" />
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
