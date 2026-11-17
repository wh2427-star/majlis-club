import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-card bg-white p-4 sm:p-5 ${className}`} {...props} />;
}

/** Light-sky panel for supporting information. Ink text only. */
export function Panel({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-card bg-sky p-4 text-ink ${className}`} {...props} />;
}
