import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { getFamily, requireUser } from "@/lib/services/family";
import { removeChildAction } from "@/app/actions/family";
import { formatTime12 } from "@/lib/domain/facts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageTitle, Section } from "@/components/ui/Misc";
import { AddChildForm } from "@/components/forms/FamilyForms";
import type { IconName } from "@/components/ui/Icon";

export const metadata = { title: "Family" };

const statusIcon: Record<string, IconName> = { sent: "clock", seen: "check", replied: "check", closed: "x" };

/** Child profiles, saved clubs, enquiry status and the week. No fixtures, messages or payments. */
export default async function FamilyPage() {
  await requireUser("/family");
  const [t, format, family] = await Promise.all([getTranslations(), getFormatter(), getFamily()]);
  return (
    <>
      <PageTitle>{t("family.title")}</PageTitle>

      <Section title={t("family.weekTitle")} id="week">
        <p className="mb-2">{t("family.weekIntro")}</p>
        {family.savedClubs.length === 0 ? (
          <p>{t("family.weekEmpty")}</p>
        ) : (
          <ol className="flex flex-col gap-2" data-testid="week">
            {family.week.map((entries, day) => (
              <li key={day} className="rounded-card bg-white p-3">
                <h3 className="font-semibold">{t(`days.long.${day}`)}</h3>
                {entries.length ? (
                  <ul className="tabular">
                    {entries.map((e, i) => (
                      <li key={i}>
                        {t("facts.timeRange", { start: formatTime12(e.start), end: formatTime12(e.end) })} · {t(`sports.${e.sportSlug}`)} · {e.clubName} ·{" "}
                        {t("facts.ages", { min: e.ageMin, max: e.ageMax })}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm">{t("family.noSessionsDay")}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title={t("family.childrenTitle")} id="children">
        <p className="mb-2">{t("family.childrenIntro")}</p>
        <Card>
          {family.children.length ? (
            <ul className="mb-4 flex flex-col gap-1">
              {family.children.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="tabular">{t("family.childAge", { nickname: c.nickname, age: c.age })}</span>
                  <form action={removeChildAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" variant="quiet" aria-label={`${t("common.remove")} ${c.nickname}`}>{t("common.remove")}</Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4">{t("family.noChildren")}</p>
          )}
          <AddChildForm />
        </Card>
      </Section>

      <Section title={t("family.savedTitle")} id="saved">
        {family.savedClubs.length ? (
          <ul className="flex flex-col gap-2">
            {family.savedClubs.map((c) => (
              <li key={c.id} className="rounded-card bg-white p-3">
                <Link href={`/clubs/${c.slug}`} className="font-semibold underline underline-offset-4">{c.name}</Link>
                <span className="block text-sm">{c.areaName}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("family.noSaved")}</p>
        )}
      </Section>

      <Section title={t("family.enquiriesTitle")} id="enquiries">
        {family.enquiries.length ? (
          <ul className="flex flex-col gap-2">
            {family.enquiries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-white p-3">
                <span>{t("family.enquiryLine", { club: e.clubName, date: format.dateTime(new Date(e.created_at), { day: "numeric", month: "short" }) })}</span>
                <Badge kind="status" icon={statusIcon[e.status]}>{t(`family.status.${e.status}`)}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("family.noEnquiries")}</p>
        )}
      </Section>
    </>
  );
}
