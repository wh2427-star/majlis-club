"use client";

import Link from "next/link";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import { useTranslations } from "next-intl";

const tab = "inline-flex min-h-tap items-center rounded-full border-2 border-ink px-4 font-semibold";

/** "Dashboard and Pro" and "List your club", plus a switcher for owners of more than one club. */
export function ClubTabs({ clubId, clubs }: { clubId: string; clubs: { id: string; name: string }[] }) {
  const t = useTranslations("clubHome");
  const router = useRouter();
  const onDashboard = useSelectedLayoutSegments().length === 0;
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <nav aria-label={t("tabsLabel")} className="flex flex-wrap gap-2">
        <Link href={`/club/${clubId}`} aria-current={onDashboard ? "page" : undefined} className={`${tab} ${onDashboard ? "bg-ink text-white" : "bg-white"}`}>
          {t("tabDashboard")}
        </Link>
        <Link href={`/club/${clubId}/edit`} aria-current={onDashboard ? undefined : "page"} className={`${tab} ${onDashboard ? "bg-white" : "bg-ink text-white"}`}>
          {t("tabListing")}
        </Link>
      </nav>
      {clubs.length > 1 ? (
        // Choosing a club does not navigate by itself (WCAG 3.2.2); the button does.
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const id = new FormData(e.currentTarget).get("club");
            if (id && id !== clubId) router.push(`/club/${id}`);
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="club-switcher" className="text-sm font-semibold">{t("switcher")}</label>
            <select id="club-switcher" name="club" defaultValue={clubId} key={clubId} className="min-h-tap rounded-control border-2 border-ink bg-white px-3">
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="inline-flex min-h-tap items-center rounded-control border-2 border-ink bg-white px-4 font-semibold">
            {t("openClub")}
          </button>
        </form>
      ) : null}
    </div>
  );
}
