import { getFormatter, getTranslations } from "next-intl/server";
import { requireClubAccess, getDashboard } from "@/lib/services/club";
import { setEnquiryStatusAction } from "@/app/actions/club";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, Panel } from "@/components/ui/Card";
import { NumberStat, PageTitle, Section } from "@/components/ui/Misc";
import type { IconName } from "@/components/ui/Icon";
import { IllustratedMessage } from "@/components/brand/Illustration";
import { getAnyIllustration } from "@/lib/illustrations";

export const metadata = { title: "Demand" };

const statusIcon: Record<string, IconName> = { sent: "clock", seen: "check", replied: "check", closed: "x" };

/** Proven: large plain numbers first, commentary below. Small numbers, including zero, shown honestly. */
export default async function DemandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { club } = await requireClubAccess(id, `/club/${id}/demand`);
  const [t, format, dash] = await Promise.all([getTranslations(), getFormatter(), getDashboard(id)]);
  // Temporary until the dashboard page replaces this view (Task 5).
  const d = { views: dash.viewsTotal, enquiries: dash.enquiries30, prevViews: 0, prevEnquiries: 0, list: dash.list, showUpgrade: dash.showUpgrade };
  return (
    <>
      <PageTitle sub={t("demand.period")}>{t("demand.title", { name: club.name })}</PageTitle>
      <Card className="flex flex-wrap gap-10" data-testid="demand-numbers">
        <NumberStat value={d.views} label={t("demand.views", { count: d.views })} />
        <NumberStat value={d.enquiries} label={t("demand.enquiries", { count: d.enquiries })} />
      </Card>
      {d.views === 0 ? (
        <div className="mt-3">
          <IllustratedMessage art={getAnyIllustration(`demand-zero:${club.id}`)}>
            <p>{t("demand.commentaryZero")}</p>
          </IllustratedMessage>
        </div>
      ) : (
        <p className="mt-3">{t("demand.commentary", { views: d.views, enquiries: d.enquiries })}</p>
      )}
      <p className="mt-1">{t("demand.previous", { views: d.prevViews, enquiries: d.prevEnquiries })}</p>

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
    </>
  );
}
