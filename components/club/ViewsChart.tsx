import { getTranslations } from "next-intl/server";

const W = 600;
const H = 240;
const PAD = { top: 32, side: 40, bottom: 40 };

/** Weekly profile views as a line, with the same numbers in a hidden table for screen readers. */
export async function ViewsChart({ weeks, note }: { weeks: number[]; note: string }) {
  const t = await getTranslations("dashboard");
  const max = Math.max(...weeks, 1);
  const step = (W - PAD.side * 2) / Math.max(weeks.length - 1, 1);
  const pts = weeks.map((v, i) => ({ v, x: PAD.side + i * step, y: PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom) }));
  const label = (i: number) => t("weekLabel", { n: i + 1 });
  return (
    <section aria-labelledby="chart-h" className="mt-4 rounded-card bg-white p-4" data-testid="views-chart">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="chart-h" className="text-lg font-semibold">{t("chartTitle")}</h2>
        <span className="text-sm">{note}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full" role="img" aria-label={t("chartSummary", { values: weeks.join(", ") })}>
        <line x1={PAD.side} x2={W - PAD.side} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--color-ink)" strokeOpacity={0.25} strokeWidth={2} />
        <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="var(--color-emerald)" strokeWidth={4} strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={7} fill="var(--color-emerald)" />
            <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize={18} fill="var(--color-ink)">{p.v}</text>
            <text x={p.x} y={H - 12} textAnchor="middle" fontSize={18} fill="var(--color-ink)">{label(i)}</text>
          </g>
        ))}
      </svg>
      <table className="sr-only">
        <caption>{t("chartTitle")}</caption>
        <thead>
          <tr><th scope="col">{t("chartWeek")}</th><th scope="col">{t("chartViews")}</th></tr>
        </thead>
        <tbody>
          {weeks.map((v, i) => (
            <tr key={i}><th scope="row">{label(i)}</th><td>{v}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
