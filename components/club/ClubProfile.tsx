import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Group, Session, Venue } from "@/lib/domain/types";
import { formatTime12 } from "@/lib/domain/facts";
import { plansForGroup, plansForSessions, type PricePlan } from "@/lib/domain/pricing";
import { groupName, planText } from "@/lib/i18n/facts";
import { ClubFacts } from "./ClubFacts";
import { ClubBadges } from "./ClubBadges";

export type ProfileData = {
  name: string;
  clubType: "academy" | "community";
  areaName: string;
  description: string;
  sessions: Session[];
  sports: string[];
  licenceVerified: boolean;
  trialOffer: boolean;
  typicalReplyDays: number;
  coachCredentials?: string;
  venues: Venue[];
  groups: Group[];
  /** Club-wide prices, for any group without its own. */
  pricePlans: PricePlan[];
};

/**
 * The club profile in the order parents see it: facts, venues (groups, times and prices), club-wide prices,
 * photos, description, coaches, then the enquiry button.
 * Sections with nothing in them are left out rather than shown empty.
 * Shared by the public page and the club's listing editor (live preview), so clubs see
 * exactly what they are judged on.
 */
export function ClubProfile({
  club,
  distanceKm,
  photos,
  actions,
  trialAction,
  headingLevel = 1,
}: {
  club: ProfileData;
  distanceKm?: number;
  /** null when the club has no photos: the section is left out. */
  photos: ReactNode | null;
  actions: ReactNode;
  /** Rendered next to each session that offers a free trial. */
  trialAction?: (s: Session) => ReactNode;
  headingLevel?: 1 | 2;
}) {
  const t = useTranslations();
  const H = headingLevel === 1 ? "h1" : "h2";
  const S = headingLevel === 1 ? "h2" : "h3";
  const V = headingLevel === 1 ? "h3" : "h4";
  const areaNames = [...new Set(club.venues.map((v) => v.areaName).filter(Boolean))];
  const areaText = areaNames.length ? new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(areaNames) : club.areaName;
  const factPlans = club.sessions.length ? plansForSessions(club, club.sessions) : club.pricePlans;
  const venues = club.venues
    .map((v) => ({ venue: v, groups: club.groups.filter((g) => g.venueId === v.id) }))
    .filter((v) => v.groups.length > 0);
  return (
    <article data-testid="club-profile">
      <H className="text-2xl font-semibold sm:text-3xl">{club.name || "…"}</H>
      <p className="mb-3">{t(`clubType.${club.clubType}`)}</p>

      <section aria-labelledby="facts-h" className="rounded-card bg-white p-4" data-section="facts">
        <S id="facts-h" className="sr-only">{t("club.factsTitle")}</S>
        <ClubFacts sessions={club.sessions} sports={club.sports} areaName={areaText} plans={factPlans} distanceKm={distanceKm} />
        <div className="mt-3">
          <ClubBadges licenceVerified={club.licenceVerified} trialOffer={club.trialOffer} />
        </div>
      </section>

      {venues.length ? (
        <section aria-labelledby="venues-h" className="mt-5" data-section="venues">
          <S id="venues-h" className="mb-2 text-xl font-semibold">{t("club.venuesTitle")}</S>
          <div className="flex flex-col gap-3">
            {venues.map(({ venue, groups }) => (
              <div key={venue.id} className="rounded-card bg-white p-4" data-venue={venue.id}>
                <V className="font-semibold">{venue.name}{venue.areaName && venue.areaName !== venue.name ? ` · ${venue.areaName}` : ""}</V>
                <ul className="mt-2 flex flex-col gap-3">
                  {groups.map((g) => {
                    const sessions = club.sessions.filter((s) => s.groupId === g.id);
                    const plans = plansForGroup(club, g.id);
                    return (
                      <li key={g.id} data-group={g.id} className="border-s-4 border-emerald ps-3">
                        <p className="font-semibold">
                          {groupName(t, g)}
                          {g.name.trim() ? <span className="font-normal"> · {t("facts.ages", { min: g.ageMin, max: g.ageMax })}</span> : null}
                        </p>
                        {sessions.length ? (
                          <ul className="tabular flex flex-col gap-1">
                            {sessions.map((s, i) => (
                              <li key={s.id || i} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span>
                                  {t(`sports.${s.sportSlug}`)} · {t("facts.sessionRow", { day: t(`days.long.${s.day}`), start: formatTime12(s.start), end: formatTime12(s.end) })}
                                </span>
                                {s.trialAvailable && trialAction ? trialAction(s) : null}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {plans.length ? (
                          <p className="tabular text-sm">
                            {t("club.groupPrices")}: {plans.map((p) => planText(t, p)).join(" · ")}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {club.pricePlans.length ? (
        <section aria-labelledby="prices-h" className="mt-5" data-section="prices">
          <S id="prices-h" className="mb-1 text-xl font-semibold">{t("club.pricesTitle")}</S>
          <p className="mb-2 text-sm">{t("club.pricesIntro")}</p>
          <ul className="tabular flex flex-col gap-1">
            {club.pricePlans.map((p, i) => <li key={p.id ?? i}>{planText(t, p)}</li>)}
          </ul>
        </section>
      ) : null}

      {photos ? (
        <section aria-labelledby="photos-h" className="mt-5" data-section="photos">
          <S id="photos-h" className="mb-2 text-xl font-semibold">{t("club.photosTitle")}</S>
          {photos}
        </section>
      ) : null}

      {club.description.trim() ? (
        <section aria-labelledby="about-h" className="mt-5" data-section="description">
          <S id="about-h" className="mb-2 text-xl font-semibold">{t("club.aboutTitle")}</S>
          <p className="whitespace-pre-line">{club.description}</p>
        </section>
      ) : null}

      {club.coachCredentials?.trim() ? (
        <section aria-labelledby="coaches-h" className="mt-5" data-section="coaches">
          <S id="coaches-h" className="mb-2 text-xl font-semibold">{t("club.coachesTitle")}</S>
          <p>{club.coachCredentials}</p>
        </section>
      ) : null}

      <div className="mt-5" data-section="actions">
        <p className="mb-2 text-sm">{t("club.replyIn", { days: club.typicalReplyDays })}</p>
        {actions}
      </div>
    </article>
  );
}
