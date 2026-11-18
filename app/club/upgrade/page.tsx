import { getTranslations } from "next-intl/server";
import { appConfig } from "@/config/app";
import { Card } from "@/components/ui/Card";
import { Notice, PageTitle, Section } from "@/components/ui/Misc";

export const metadata = { title: "Paid tools" };

/**
 * Paid layer stub. PAID_TOOLS_ENABLED is false in v1: this page only explains.
 * No prices, no billing, no payment code. Principle: one published price list,
 * tiered by club size, never by club type or enquiry volume; tools manage and promote demand,
 * never buy position.
 */
export default async function UpgradePage() {
  const t = await getTranslations("upgrade");
  return (
    <>
      <PageTitle sub={t("intro")}>{t("title")}</PageTitle>
      {!appConfig.paidToolsEnabled ? <Notice>{t("notAvailable")}</Notice> : null}
      <Section title={t("what")} id="what">
        <Card>
          <ul className="list-disc ps-5">{t("items").split("|").map((i) => <li key={i}>{i}</li>)}</ul>
        </Card>
      </Section>
      <Section title={t("never")} id="never">
        <Card>
          <ul className="list-disc ps-5">{t("neverItems").split("|").map((i) => <li key={i}>{i}</li>)}</ul>
        </Card>
      </Section>
      <p className="mt-4">{t("pricing")}</p>
    </>
  );
}
