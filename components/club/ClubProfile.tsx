import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Session } from "@/lib/domain/types";
import { formatTime12 } from "@/lib/domain/facts";
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
};

/**
 * The club profile in the order parents see it: facts, photos, description, coaches, then the enquiry button.
 * Sections with nothing in them are left out rather than shown empty.
 * Shared by the public page and the club's listing editor (live preview), so clubs see
 * exactly what they are judged on.
 */
export function ClubProfile({
  club,
  distanceKm,
  photos,
  actions,
  headingLevel = 1,
}: {
  club: ProfileData;
  distanceKm?: number;
  /** null when the club has no photos: the section is left out. */
  photos: ReactNode | null;
  actions: ReactNode;
  headingLevel?: 1 | 2;
}) {
  const t = useTranslations();
  const H = headingLevel === 1 ? "h1" : "h2";
  const S = headingLevel === 1 ? "h2" : "h3";
  return (
    <article data-testid="club-profile">
      <H className="text-2xl font-semibold sm:text-3xl">{club.name || "…"}</H>
      <p className="mb-3">{t(`clubType.${club.clubType}`)}</p>

      <section aria-labelledby="facts-h" className="rounded-card bg-white p-4" data-section="facts">
        <S id="facts-h" className="sr-only">{t("club.factsTitle")}</S>
        <ClubFacts sessions={club.sessions} sports={club.sports} areaName={club.areaName} distanceKm={distanceKm} />
        <div className="mt-3">
          <ClubBadges licenceVerified={club.licenceVerified} trialOffer={club.trialOffer} />
        </div>
        {club.sessions.length ? (
          <>
            <S className="mt-4 font-semibold">{t("facts.sessionsTitle")}</S>
            <ul className="tabular mt-1 flex flex-col gap-1">
              {club.sessions.map((s, i) => (
                <li key={s.id || i}>
                  {t(`sports.${s.sportSlug}`)} · {t("facts.sessionRow", { day: t(`days.long.${s.day}`), start: formatTime12(s.start), end: formatTime12(s.end) })} ·{" "}
                  {t("facts.ages", { min: s.ageMin, max: s.ageMax })} · {t("facts.price", { price: s.priceAed })}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

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
