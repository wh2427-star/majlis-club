import { useTranslations } from "next-intl";
import type { Session } from "@/lib/domain/types";
import { agesText, daysAndTimes, priceText, sportsText } from "@/lib/i18n/facts";

/**
 * Rule 3, answers first: sport, age range, days and times, area, price per session, distance.
 * This order is fixed and is asserted by an end-to-end test.
 */
export function ClubFacts({
  sessions,
  sports,
  areaName,
  distanceKm,
}: {
  sessions: Session[];
  sports: string[];
  areaName: string;
  distanceKm?: number;
}) {
  const t = useTranslations();
  const rows: [string, string, string][] = [
    ["sport", t("facts.sport"), sportsText(t, sessions, sports)],
    ["ages", t("facts.agesLabel"), agesText(t, sessions, true) || t("facts.noSessions")],
    ["days", t("facts.daysLabel"), daysAndTimes(t, sessions)],
    ["area", t("facts.areaLabel"), areaName],
    ["price", t("facts.priceLabel"), priceText(t, sessions) || "–"],
  ];
  if (distanceKm != null) rows.push(["distance", t("facts.distanceLabel"), t("common.km", { km: distanceKm })]);
  return (
    <dl className="tabular grid grid-cols-[auto_1fr] gap-x-3 gap-y-1" data-testid="club-facts">
      {rows.map(([key, label, value]) => (
        <div key={key} className="contents" data-fact={key}>
          <dt className="text-sm">{label}</dt>
          <dd className="font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
