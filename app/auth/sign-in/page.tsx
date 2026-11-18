import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { PageTitle, Section } from "@/components/ui/Misc";
import { MagicLinkForm, SignInForm } from "@/components/forms/AuthForms";
import { safeNext } from "@/lib/services/auth";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const t = await getTranslations("auth");
  return (
    <>
      <PageTitle sub={t("whyAccount")}>{t("signInTitle")}</PageTitle>
      <Card><SignInForm next={next} /></Card>
      <Section title={t("magicTitle")} id="magic">
        <Card><MagicLinkForm next={next} /></Card>
      </Section>
      <p className="mt-6">
        {t("noAccount")} <Link href={`/auth/sign-up?next=${encodeURIComponent(next)}`}>{t("signUpTitle")}</Link>
      </p>
    </>
  );
}
