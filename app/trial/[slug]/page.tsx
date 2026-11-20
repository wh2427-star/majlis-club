import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getClubBySlug } from "@/lib/data/queries";
import { getChildren, getParentContact, requireUser } from "@/lib/services/family";
import { formatTime12 } from "@/lib/domain/facts";
import { groupName } from "@/lib/i18n/facts";
import { isoDay } from "@/lib/schemas";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/Misc";
import { TrialForm } from "@/components/forms/FamilyForms";

export const metadata = { title: "Book a free trial" };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ session?: string }> };

/** A signed-in parent asks for a free trial of one of the club's trial sessions. */
export default async function TrialPage({ params, searchParams }: Props) {
  const [{ slug }, { session }] = await Promise.all([params, searchParams]);
  await requireUser(`/trial/${slug}${session ? `?session=${session}` : ""}`);
  const club = await getClubBySlug(slug);
  if (!club || club.status !== "approved") notFound();
  const trialSessions = club.sessions.filter((s) => s.trialAvailable);
  if (trialSessions.length === 0) notFound();
  // Session ids change when the club saves its schedule; an out-of-date link falls back to the first trial session.
  const selected = trialSessions.find((s) => s.id === session)?.id ?? trialSessions[0].id;

  const [t, contact, kids] = await Promise.all([getTranslations(), getParentContact(), getChildren()]);
  const label = (s: (typeof trialSessions)[number]) => {
    const group = club.groups.find((g) => g.id === s.groupId);
    const venue = club.venues.find((v) => v.id === s.venueId);
    return t("trial.sessionLine", {
      group: group ? groupName(t, group) : t(`sports.${s.sportSlug}`),
      venue: venue?.name ?? club.areaName,
      day: t(`days.long.${s.day}`),
      start: formatTime12(s.start),
      end: formatTime12(s.end),
    });
  };
  return (
    <>
      <PageTitle sub={t("trial.intro")}>{t("trial.title", { club: club.name })}</PageTitle>
      <Card>
        <TrialForm
          club={{ id: club.id, name: club.name }}
          sessions={trialSessions.map((s) => ({ id: s.id, label: label(s) }))}
          selected={selected}
          contact={{ name: contact?.name ?? "", email: contact?.email ?? "" }}
          kids={kids.map((k) => ({ id: k.id, label: t("enquiry.childLine", { nickname: k.nickname, age: k.age }) }))}
          minDate={isoDay(0)}
          maxDate={isoDay(60)}
        />
      </Card>
    </>
  );
}
