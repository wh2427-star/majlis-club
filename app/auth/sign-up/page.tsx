import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/Misc";
import { SignUpForm } from "@/components/forms/AuthForms";
import { safeNext } from "@/lib/services/auth";

export const metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; role?: string }> }) {
  const sp = await searchParams;
  const t = await getTranslations("auth");
  return (
    <>
      <PageTitle sub={t("whyAccount")}>{t("signUpTitle")}</PageTitle>
      <Card><SignUpForm next={safeNext(sp.next, "/family")} role={sp.role === "club" ? "club" : "parent"} /></Card>
      <p className="mt-6">
        {t("haveAccount")} <Link href="/auth/sign-in">{t("signInTitle")}</Link>
      </p>
    </>
  );
}
