import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
      <Link href="/" className="inline-flex min-h-tap items-center rounded-control">
        <Logo />
      </Link>
    </header>
  );
}
