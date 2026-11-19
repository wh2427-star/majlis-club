import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, getMyClubs } from "@/lib/data/queries";
import { ButtonLink } from "@/components/ui/Button";
import { PageTitle, Section } from "@/components/ui/Misc";

export const metadata = { title: "Your club" };

/** Owners land on their main club's dashboard. Without a club, invite them to add or claim one. */
export default async function ClubHome() {
  const [t, user] = await Promise.all([getTranslations("clubArea"), getCurrentUser()]);
  if (!user)
    return (
      <>
        <PageTitle sub={t("intro")}>{t("title")}</PageTitle>
        <p className="mb-3">{t("addPrompt")}</p>
        <ButtonLink href="/auth/sign-up?role=club">{t("signUpClub")}</ButtonLink>
      </>
    );
  const clubs = await getMyClubs();
  // The main club: the first approved one they joined, else the first they joined.
  const main = clubs.find((c) => c.status === "approved") ?? clubs[0];
  if (main) redirect(`/club/${main.id}`);
  return (
    <>
      <PageTitle sub={t("intro")}>{t("title")}</PageTitle>
      <p>{t("noClubs")}</p>
      <Section title={t("addPrompt")} id="add">
        <ButtonLink href="/club/new" variant="secondary">{t("addButton")}</ButtonLink>
      </Section>
    </>
  );
}
