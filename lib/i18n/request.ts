import { getRequestConfig } from "next-intl/server";
import { appConfig } from "@/config/app";

// English only in v1. Arabic is added by a second messages file and a locale switch;
// every UI string already goes through next-intl, so no strings need extracting later.
export default getRequestConfig(async () => {
  const locale = appConfig.locale;
  return {
    locale,
    timeZone: "Asia/Dubai",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
