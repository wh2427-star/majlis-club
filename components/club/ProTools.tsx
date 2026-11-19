import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";

const tools = ["inbox", "trials", "registration", "payments", "messaging", "campaigns", "analytics"] as const;

/** Optional paid tools, always shown locked. No prices; they never affect search order. */
export async function ProTools() {
  const t = await getTranslations("pro");
  const card = (key: (typeof tools)[number] | "store", badge: string) => (
    <li key={key}>
      <Link href="/club/upgrade" className="flex h-full flex-col gap-2 rounded-card border-2 border-dashed border-ink/40 bg-sand p-4 hover:border-ink">
        <span className="flex flex-wrap items-start justify-between gap-2">
          <span className="text-lg font-semibold">{t(`tools.${key}.title`)}</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-ink bg-white px-3 py-1 text-sm">
            <Icon name={key === "store" ? "hourglass" : "lock"} size={14} />
            {badge}
          </span>
        </span>
        <span>{t(`tools.${key}.body`)}</span>
      </Link>
    </li>
  );
  return (
    <section aria-labelledby="pro-h" className="mt-8" data-testid="club-pro">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pro-h" className="text-xl font-semibold">{t("title")}</h2>
        <span className="text-sm">{t("aside")}</span>
      </div>
      <p className="mt-1">{t("intro")}</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {tools.map((k) => card(k, t("locked")))}
        {card("store", t("comingSoon"))}
      </ul>
    </section>
  );
}
