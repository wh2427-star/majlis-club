import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/Logo";
import { getCurrentUser } from "@/lib/data/queries";
import { signOutAction } from "@/app/actions/auth";

const navLink = "inline-flex min-h-tap items-center rounded-control px-2 underline underline-offset-4";

export async function SiteHeader() {
  const [t, user] = await Promise.all([getTranslations("common"), getCurrentUser()]);
  return (
    <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
      <Link href="/" className="inline-flex min-h-tap items-center rounded-control">
        <Logo />
      </Link>
      <nav aria-label={t("nav")} className="flex flex-wrap items-center gap-1">
        {user ? (
          <>
            {user.role !== "club" ? <Link href="/family" className={navLink}>{t("navFamily")}</Link> : null}
            {user.role !== "parent" ? <Link href="/club" className={navLink}>{t("navClub")}</Link> : null}
            {user.role === "admin" ? <Link href="/admin" className={navLink}>{t("navAdmin")}</Link> : null}
            <form action={signOutAction}>
              <button type="submit" className={navLink}>{t("signOut")}</button>
            </form>
          </>
        ) : (
          <Link href="/auth/sign-in" className={navLink}>{t("signIn")}</Link>
        )}
      </nav>
    </header>
  );
}
