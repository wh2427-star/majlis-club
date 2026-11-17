import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/ui/Misc";

// Temporary home; replaced by the area picker in the parent-search stage.
export default async function Home() {
  const t = await getTranslations("meta");
  return <PageTitle>{t("strapline")}</PageTitle>;
}
