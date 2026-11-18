import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/Button";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <>
      <h1 className="text-2xl font-semibold">{t("notFound")}</h1>
      <ButtonLink href="/" className="mt-4">{t("goHome")}</ButtonLink>
    </>
  );
}
