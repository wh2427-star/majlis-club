import Link from "next/link";
import { useTranslations } from "next-intl";
import type { RankedClub } from "@/lib/domain/search";
import { ClubFacts } from "./ClubFacts";
import { ClubBadges } from "./ClubBadges";
import { plansForSessions } from "@/lib/domain/pricing";

/** Facts first, then badges, then a short line of the club's own copy. */
export function ClubCard({ club, areaSlug, featured = false }: { club: RankedClub; areaSlug: string; featured?: boolean }) {
  const t = useTranslations();
  return (
    <article
      className={`rounded-card bg-white p-4 ${featured ? "border-2 border-ink" : ""}`}
      data-testid={featured ? "featured-card" : "club-card"}
      data-club-id={club.id}
    >
      <h3 className="mb-2 text-lg font-semibold">
        <Link href={`/clubs/${club.slug}?area=${areaSlug}`} className="underline underline-offset-4">
          {club.name}
        </Link>
      </h3>
      <ClubFacts
        sessions={club.matchingSessions}
        sports={club.sports}
        areaName={club.nearestVenue?.areaName ?? club.areaName}
        plans={plansForSessions(club, club.matchingSessions)}
        distanceKm={club.distanceKm}
      />
      <div className="mt-3">
        <ClubBadges licenceVerified={club.licenceVerified} trialOffer={club.trialOffer} />
      </div>
      {club.description ? <p className="mt-2 line-clamp-2" data-testid="club-copy">{club.description}</p> : null}
      <p className="mt-1 text-sm">{t(`clubType.${club.clubType}`)}</p>
    </article>
  );
}
