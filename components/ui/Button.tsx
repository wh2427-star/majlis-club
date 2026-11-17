import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "quiet" | "danger";

// Emerald is the one action colour. White text only on Emerald, Berry or Ink.
const variants: Record<Variant, string> = {
  primary: "bg-emerald text-white hover:brightness-110",
  secondary: "bg-white text-ink border-2 border-ink hover:bg-sand",
  quiet: "bg-transparent text-emerald underline underline-offset-4",
  danger: "bg-berry text-white hover:brightness-110",
};

const base =
  "inline-flex min-h-tap min-w-tap items-center justify-center gap-2 rounded-control px-5 py-2 font-semibold text-base disabled:opacity-60 disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
