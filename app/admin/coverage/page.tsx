import { getTranslations } from "next-intl/server";
import { coverageDashboard } from "@/lib/services/admin";
import { setIdentifiedAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice, PageTitle, ProgressBar, Section } from "@/components/ui/Misc";

export const metadata = { title: "Coverage" };

/** Coverage per cluster and the 25% opening rule. Shown, never automated. */
export default async function Coverage() {
  const [t, d] = await Promise.all([getTranslations(), coverageDashboard()]);
  return (
    <>
      <PageTitle>{t("admin.coverageTitle")}</PageTitle>
      {d.rule ? (
        <section className="mb-6 rounded-card bg-white p-4" data-testid="coverage-rule">
          <p>{t("admin.coverageRule", { needed: d.rule.needed })}</p>
          <div className="mt-3">
            <ProgressBar value={d.rule.listed} max={d.rule.needed} label={t("admin.coverageLine", { listed: d.rule.listed, identified: d.rule.identified })} />
          </div>
          <p className="tabular mt-2 font-semibold">
            {d.rule.listed} / {d.rule.needed}
          </p>
          <div className="mt-2">
            <Notice tone={d.rule.thresholdMet ? "success" : "info"}>
              {d.rule.thresholdMet ? t("admin.coverageMet") : t("admin.coverageNotMet", { remaining: d.rule.needed - d.rule.listed })}
            </Notice>
          </div>
        </section>
      ) : null}
      <ul className="flex flex-col gap-3">
        {d.clusters.map((c) => (
          <li key={c.cluster_id} className="rounded-card bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{c.name}</h2>
              <Badge kind="status" icon={c.status === "live" ? "check" : "hourglass"}>{t(c.status === "live" ? "common.live" : "common.comingSoon")}</Badge>
            </div>
            <p className="tabular">{t("admin.coverageLine", { listed: c.listed, identified: c.identified })}</p>
            <p className="tabular">{t("admin.waitlistCount", { count: c.waitlist })}</p>
            <form action={setIdentifiedAction} className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={c.cluster_id} />
              <TextField id={`ident-${c.cluster_id}`} name="identified" type="number" min={0} defaultValue={c.identified} label={t("admin.identifiedLabel")} />
              <Button type="submit" variant="secondary">{t("admin.updateIdentified")}</Button>
            </form>
          </li>
        ))}
      </ul>
      {d.waitlistByArea.length ? (
        <Section title={t("home.comingSoonTitle")} id="waitlist">
          <ul className="tabular">
            {d.waitlistByArea.map(([area, n]) => (
              <li key={area}>{area}: {t("admin.waitlistCount", { count: n })}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
