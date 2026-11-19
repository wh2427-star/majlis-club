import Link from "next/link";
import { useTranslations } from "next-intl";

/** The four listing steps. Before a club exists (step 1 of a new listing) the steps are not links. */
export function ListingStepper({ clubId, current }: { clubId?: string; current: 1 | 2 | 3 | 4 }) {
  const t = useTranslations("wizard");
  const steps = [
    { n: 1, label: t("step1"), href: `/club/${clubId}/edit` },
    { n: 2, label: t("step2"), href: `/club/${clubId}/edit/schedule` },
    { n: 3, label: t("step3"), href: `/club/${clubId}/photos` },
    { n: 4, label: t("step4"), href: `/club/${clubId}/preview` },
  ];
  return (
    <ol aria-label={t("stepsLabel")} className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {steps.map((s) => {
        const reached = s.n <= current;
        const isCurrent = s.n === current;
        const inner = (
          <>
            <span aria-hidden className={`block h-2 rounded-full ${reached ? "bg-emerald" : "bg-ink/15"}`} />
            <span className={`mt-1 block text-center text-sm ${isCurrent ? "font-semibold" : ""}`}>{s.label}</span>
          </>
        );
        return (
          <li key={s.n}>
            {clubId ? (
              <Link href={s.href} aria-current={isCurrent ? "step" : undefined} className="block min-h-tap rounded-control py-1">
                {inner}
              </Link>
            ) : (
              <span aria-current={isCurrent ? "step" : undefined} className="block min-h-tap py-1">{inner}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
