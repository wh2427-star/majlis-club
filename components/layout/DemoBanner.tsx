import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/Icon";

export async function DemoBanner() {
  const t = await getTranslations("common");
  return (
    <div className="bg-ink px-4 py-2 text-center text-sm text-white" data-testid="demo-banner">
      <span className="inline-flex items-center gap-2">
        <Icon name="info" size={16} />
        {t("demoBanner")}
      </span>
    </div>
  );
}
