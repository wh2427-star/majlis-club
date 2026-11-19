import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { getClubPhotos } from "@/lib/data/queries";
import { getDashboard, getLicenceStatus, requireClubAccess } from "@/lib/services/club";
import { setEnquiryStatusAction } from "@/app/actions/club";
import { profileChecklist } from "@/lib/domain/dashboard";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { Notice, PageTitle, Section } from "@/components/ui/Misc";
import type { IconName } from "@/components/ui/Icon";
import { IllustratedMessage } from "@/components/brand/Illustration";
import { getAnyIllustration } from "@/lib/illustrations";
import { StatCard } from "@/components/club/StatCard";
import { ViewsChart } from "@/components/club/ViewsChart";
import { ProfileStrength } from "@/components/club/ProfileStrength";
import { ProTools } from "@/components/club/ProTools";

export const metadata = { title: "Club dashboard" };

const statusIcon: Record<string, IconName> = { sent: "clock", seen: "check", replied: "check", closed: "x" };

/** The club owner's home: real numbers first, then what to do about them. Small numbers, including zero, shown honestly. */
export default async function ClubDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { club } = await requireClubAccess(id, `/club/${id}`);
  const [t, format, d, photos, licence] = await Promise.all([
    getTranslations(),
    getFormatter(),
    getDashboard(id),
    getClubPhotos(id),
    getLicenceStatus(id),
  ]);
  const checklist = profileChecklist({
    description: club.description,
    coachCredentials: club.coachCredentials,
    ageGroups: club.ageGroups,
    photoCount: photos.filter((p) => p.status === "visible").length,
    licenceVerified: licence.state === "verified",
    sessionCount: club.sessions.length,
  });
  const trend = d.viewsTrend;
  const trendNote =
    trend.kind === "percent"
      ? t("dashboard.viewsChange", { change: trend.value > 0 ? `+${trend.value}` : String(trend.value) })
      : trend.kind === "fromZero" ? t("dashboard.viewsFromZero") : t("dashboard.viewsNoChange");
  const manage: [string, string][] = [
    [`/club/${club.id}/licence`, t("clubArea.licence")],
    [`/club/${club.id}/photos`, t("clubArea.photos")],
    ...(club.status === "approved" ? ([[`/clubs/${club.slug}`, t("clubArea.view")]] as [string, string][]) : []),
  ];
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PageTitle sub={t("dashboard.intro", { name: club.name })}>{t("dashboard.title")}</PageTitle>
        {club.status === "approved" ? <Badge kind="status" icon="check">{t("dashboard.live")}</Badge> : null}
      </div>
      {club.status === "pending" ? <div className="mb-4"><Notice tone="warning">{t("club.pending")}</Notice></div> : null}
      <nav aria-label={t("dashboard.manageLabel")} className="mb-4">
        <ul className="flex flex-wrap gap-x-4">
          {manage.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="inline-flex min-h-tap items-center underline underline-offset-4">{label}</Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-label={t("dashboard.statsLabel")} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          testId="stat-views" label={t("dashboard.views")} value={d.viewsTotal}
          note={trendNote}
        />
        <StatCard testId="stat-saves" label={t("dashboard.saves")} value={d.saves} note={t("dashboard.savesNote")} />
        <StatCard testId="stat-enquiries" label={t("dashboard.enquiries")} value={d.enquiriesTotal} note={t("dashboard.enquiriesNote")} />
      </section>

      <ViewsChart weeks={d.weeks} note={t("dashboard.chartNote", { count: d.enquiriesTotal })} />
      {d.viewsTotal === 0 ? (
        <div className="mt-3">
          <IllustratedMessage art={getAnyIllustration(`demand-zero:${club.id}`)}>
            <p>{t("demand.commentaryZero")}</p>
          </IllustratedMessage>
        </div>
      ) : null}

      <ProfileStrength clubId={club.id} items={checklist} />

      {d.showUpgrade ? (
        <Panel className="mt-4" data-testid="upgrade-prompt">
          <h2 className="font-semibold">{t("demand.upgradeTitle")}</h2>
          <p className="mt-1">{t("demand.upgradeBody")}</p>
          <ButtonLink href="/club/upgrade" variant="secondary" className="mt-2">{t("demand.upgradeLink")}</ButtonLink>
        </Panel>
      ) : null}

      <Section title={t("demand.enquiriesTitle")} id="enquiries">
        {d.list.length === 0 ? <p>{t("demand.noEnquiries")}</p> : null}
        <ul className="flex flex-col gap-3">
          {d.list.map((e) => (
            <li key={e.id} className="rounded-card bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{t("demand.from", { name: e.contact_name })}</span>
                <Badge kind="status" icon={statusIcon[e.status]}>{t(`family.status.${e.status}`)}</Badge>
              </div>
              <p className="text-sm">{format.dateTime(new Date(e.created_at), { day: "numeric", month: "short" })}</p>
              <p className="break-words">{e.contact_email}{e.contact_phone ? ` · ${e.contact_phone}` : ""}</p>
              {e.child_nickname ? <p>{t("demand.childLine", { nickname: e.child_nickname, year: e.child_birth_year ?? "" })}</p> : null}
              {e.message ? <p className="mt-1">{e.message}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {(["seen", "replied", "closed"] as const)
                  .filter((s) => s !== e.status)
                  .map((s) => (
                    <form key={s} action={setEnquiryStatusAction}>
                      <input type="hidden" name="clubId" value={club.id} />
                      <input type="hidden" name="enquiryId" value={e.id} />
                      <input type="hidden" name="status" value={s} />
                      <Button type="submit" variant="secondary">
                        {t(s === "seen" ? "demand.markSeen" : s === "replied" ? "demand.markReplied" : "demand.markClosed")}
                      </Button>
                    </form>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <ProTools />

      <Section title={t("clubArea.addPrompt")} id="add">
        <ButtonLink href="/club/new" variant="secondary">{t("dashboard.addClub")}</ButtonLink>
      </Section>
    </>
  );
}
