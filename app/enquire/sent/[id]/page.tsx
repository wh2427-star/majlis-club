import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getClubById } from "@/lib/data/queries";
import { getEnquiry, requireUser } from "@/lib/services/family";
import { ageFromBirthYear } from "@/lib/domain/facts";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice, Section } from "@/components/ui/Misc";

export const metadata = { title: "Enquiry sent" };

/** Confirmation: states exactly what the club received and when to expect a reply. */
export default async function SentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/enquire/sent/${id}`);
  const enquiry = await getEnquiry(id);
  if (!enquiry) notFound();
  const [t, club] = await Promise.all([getTranslations(), getClubById(enquiry.club_id)]);
  if (!club) notFound();
  const rows: [string, string][] = [
    [t("enquiry.name"), enquiry.contact_name],
    [t("enquiry.email"), enquiry.contact_email],
  ];
  if (enquiry.contact_phone) rows.push([t("enquiry.phone"), enquiry.contact_phone]);
  if (enquiry.child_nickname && enquiry.child_birth_year)
    rows.push([t("enquiry.child"), t("enquiry.childLine", { nickname: enquiry.child_nickname, age: ageFromBirthYear(enquiry.child_birth_year) })]);
  if (enquiry.sports?.slug) rows.push([t("enquiry.sport"), t(`sports.${enquiry.sports.slug}`)]);
  if (enquiry.message) rows.push([t("enquiry.message"), enquiry.message]);
  return (
    <>
      <Notice tone="success">
        <h1 className="text-2xl font-semibold">{t("enquiry.sentTitle")}</h1>
        <p>{t("enquiry.sentBody", { club: club.name })}</p>
      </Notice>
      <Section title={t("enquiry.receivedTitle")} id="received">
        <Card>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1" data-testid="enquiry-received">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-sm">{k}</dt>
                <dd className="font-semibold break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </Section>
      <Section title={t("enquiry.replyTitle")} id="reply">
        <p>{t("enquiry.replyBody", { club: club.name, days: club.typicalReplyDays })}</p>
        <p className="mt-1">{t("enquiry.trackBody")}</p>
      </Section>
      <ButtonLink href="/family" className="mt-4">{t("enquiry.toFamily")}</ButtonLink>
    </>
  );
}
