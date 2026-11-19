import { getTranslations } from "next-intl/server";
import { getAreas, getSports } from "@/lib/data/queries";
import { requireUser } from "@/lib/services/family";
import { searchClaimable } from "@/lib/services/club";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { PageTitle, Section } from "@/components/ui/Misc";
import { ClaimClubForm } from "@/components/forms/ClubForms";
import { BasicsForm } from "@/components/forms/BasicsForm";
import { ListingStepper } from "@/components/club/ListingStepper";
import { Illustration } from "@/components/brand/Illustration";
import { getAnyIllustration } from "@/lib/illustrations";

export const metadata = { title: "Add your club" };

export default async function NewClubPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser("/club/new");
  const { q = "" } = await searchParams;
  const [t, areas, sports, matches] = await Promise.all([getTranslations(), getAreas(), getSports(), searchClaimable(q)]);
  return (
    <>
      <PageTitle sub={t("onboard.intro")}>{t("onboard.title")}</PageTitle>
      <Illustration art={getAnyIllustration("onboard")} size="md" priority className="mb-4" />

      <Section title={t("onboard.claimTitle")} id="claim">
        <Card>
          <form method="get" className="flex flex-col gap-3">
            <TextField id="claim-q" name="q" defaultValue={q} label={t("onboard.claimSearch")} />
            <Button type="submit" variant="secondary">{t("onboard.claimFind")}</Button>
          </form>
          {q ? (
            matches.length ? (
              <ul className="mt-3 flex flex-col gap-2">
                {matches.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{m.name} · {m.areas?.name}</span>
                    <ClaimClubForm clubId={m.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3">{t("onboard.claimNone")}</p>
            )
          ) : null}
          <p className="mt-3 text-sm">{t("onboard.claimNote")}</p>
        </Card>
      </Section>

      <Section title={t("onboard.createTitle")} id="create">
        <Card>
          <ListingStepper current={1} />
          <BasicsForm
            areas={areas.map((a) => ({ value: a.id, label: a.name }))}
            sports={sports.map((s) => ({ value: s.id, label: t(`sports.${s.slug}`) }))}
          />
        </Card>
      </Section>
    </>
  );
}
