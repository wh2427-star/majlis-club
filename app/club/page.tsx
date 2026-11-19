import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, getMyClubs } from "@/lib/data/queries";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageTitle, Section } from "@/components/ui/Misc";
import type { IconName } from "@/components/ui/Icon";

export const metadata = { title: "Your club" };

const statusIcon: Record<string, IconName> = { pending: "hourglass", approved: "check", rejected: "x" };

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
  // Owners land on their main club: the first approved one they joined, else the first they joined.
  const main = clubs.find((c) => c.status === "approved") ?? clubs[0];
  if (main) redirect(`/club/${main.id}`);
  const links = (id: string) => [
    [`/club/${id}/edit`, t("edit")],
    [`/club/${id}/photos`, t("photos")],
    [`/club/${id}/licence`, t("licence")],
    [`/club/${id}/demand`, t("demand")],
  ];
  return (
    <>
      <PageTitle sub={t("intro")}>{t("title")}</PageTitle>
      {clubs.length === 0 ? <p>{t("noClubs")}</p> : null}
      <ul className="flex flex-col gap-3">
        {clubs.map((c) => (
          <li key={c.id} className="rounded-card bg-white p-4">
            <h2 className="text-lg font-semibold">{c.name}</h2>
            <Badge kind="status" icon={statusIcon[c.status]}>
              {t(c.status === "approved" ? "statusApproved" : c.status === "pending" ? "statusPending" : "statusRejected")}
            </Badge>
            <ul className="mt-2 flex flex-wrap gap-x-4">
              {links(c.id).map(([href, label]) => (
                <li key={href}><Link href={href} className="inline-flex min-h-tap items-center underline underline-offset-4">{label}</Link></li>
              ))}
              {c.status === "approved" ? (
                <li><Link href={`/clubs/${c.slug}`} className="inline-flex min-h-tap items-center underline underline-offset-4">{t("view")}</Link></li>
              ) : null}
            </ul>
          </li>
        ))}
      </ul>
      <Section title={t("addPrompt")} id="add">
        <ButtonLink href="/club/new" variant="secondary">{t("addButton")}</ButtonLink>
      </Section>
    </>
  );
}
