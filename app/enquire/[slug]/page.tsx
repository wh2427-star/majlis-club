import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getClubBySlug, getSports } from "@/lib/data/queries";
import { getChildren, getParentContact, requireUser } from "@/lib/services/family";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/Misc";
import { EnquiryForm } from "@/components/forms/FamilyForms";

export const metadata = { title: "Send enquiry" };

export default async function EnquirePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireUser(`/enquire/${slug}`);
  const club = await getClubBySlug(slug);
  if (!club || club.status !== "approved") notFound();
  const [t, contact, kids, sports] = await Promise.all([getTranslations(), getParentContact(), getChildren(), getSports()]);
  const clubSports = sports.filter((s) => club.sports.includes(s.slug));
  return (
    <>
      <PageTitle sub={t("enquiry.intro")}>{t("enquiry.title", { club: club.name })}</PageTitle>
      <Card>
        <EnquiryForm
          club={{ id: club.id, name: club.name }}
          contact={contact ?? { name: "", email: "", phone: "" }}
          kids={kids.map((k) => ({ id: k.id, label: t("enquiry.childLine", { nickname: k.nickname, age: k.age }) }))}
          sports={clubSports.map((s) => ({ id: s.id, label: t(`sports.${s.slug}`) }))}
        />
      </Card>
    </>
  );
}
