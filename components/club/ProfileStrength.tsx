import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ChecklistKey } from "@/lib/domain/dashboard";
import { ProgressBar } from "@/components/ui/Misc";

const target = (clubId: string, key: ChecklistKey) =>
  key === "photos" ? `/club/${clubId}/photos` : key === "licence" ? `/club/${clubId}/licence` : key === "schedule" || key === "prices" ? `/club/${clubId}/edit/schedule` : `/club/${clubId}/edit`;

/** What is missing from the listing, with a nudge for each. Hidden when the profile is complete. */
export async function ProfileStrength({ clubId, items }: { clubId: string; items: { key: ChecklistKey; done: boolean }[] }) {
  const t = await getTranslations("strength");
  const todo = items.filter((i) => !i.done);
  if (todo.length === 0) return null;
  const done = items.length - todo.length;
  return (
    <section aria-labelledby="strength-h" className="mt-4 rounded-card bg-white p-4" data-testid="profile-strength">
      <h2 id="strength-h" className="text-lg font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm">{t("progress", { done, total: items.length })}</p>
      <div className="mt-2">
        <ProgressBar value={done} max={items.length} label={t("progress", { done, total: items.length })} />
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {todo.map((i) => (
          <li key={i.key}>
            <Link href={target(clubId, i.key)} className="inline-flex min-h-tap items-center font-semibold underline underline-offset-4">
              {t(`items.${i.key}.action`)}
            </Link>
            <p className="text-sm">{t(`items.${i.key}.nudge`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
