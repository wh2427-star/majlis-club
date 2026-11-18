import { useTranslations } from "next-intl";
import { DotsDivide } from "@/components/brand/DotsDivide";

export default function Loading() {
  const t = useTranslations("common");
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status">
      <DotsDivide label={t("loading")} size={80} />
    </div>
  );
}
