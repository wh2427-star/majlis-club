import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";

export function ClubBadges({ licenceVerified, trialOffer }: { licenceVerified: boolean; trialOffer: boolean }) {
  const t = useTranslations("facts");
  if (!licenceVerified && !trialOffer) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {licenceVerified ? <Badge kind="licence">{t("licenceVerified")}</Badge> : null}
      {trialOffer ? <Badge kind="trial">{t("trialSession")}</Badge> : null}
    </div>
  );
}
