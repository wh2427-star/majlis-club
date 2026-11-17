import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/** Notice strip. Ink text on a light ground plus an icon. */
export function Notice({
  tone = "info",
  children,
  icon,
}: {
  tone?: "info" | "warning" | "success";
  children: ReactNode;
  icon?: IconName;
}) {
  const cls = { info: "bg-sky", warning: "bg-sunshine", success: "bg-white border-2 border-emerald" }[tone];
  const ic: IconName = icon ?? ({ info: "info", warning: "alert", success: "check" } as const)[tone];
  return (
    <div className={`flex items-start gap-2 rounded-card p-3 text-ink ${cls}`} role="status">
      <Icon name={ic} className="mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

/** Large, plain number with label. Used in the demand view. */
export function NumberStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="tabular text-5xl font-semibold leading-none">{value}</span>
      <span className="mt-1">{label}</span>
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-4 w-full overflow-hidden rounded-full border-2 border-ink bg-white"
      >
        <div className="h-full bg-emerald" style={{ inlineSize: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-semibold sm:text-3xl">{children}</h1>
      {sub ? <p className="mt-1">{sub}</p> : null}
    </header>
  );
}

export function Section({ title, children, id }: { title: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="mt-6">
      <h2 id={id} className="mb-2 text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}
