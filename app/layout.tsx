import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { appConfig } from "@/config/app";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DemoBanner } from "@/components/layout/DemoBanner";
import "./globals.css";

// Two weights only: Regular and SemiBold. Family is one token (--font-brand).
const brandFont = IBM_Plex_Sans({
  variable: "--font-brand",
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: `${appConfig.name} · ${t("strapline")}`, template: `%s · ${appConfig.name}` },
    description: t("description"),
    manifest: "/manifest.webmanifest",
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = { themeColor: "#F6EFE4", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("common");
  return (
    <html lang={appConfig.locale} dir={appConfig.dir} className={brandFont.variable}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-white focus:p-3"
          >
            {t("skipToContent")}
          </a>
          {appConfig.demoData ? <DemoBanner /> : null}
          <SiteHeader />
          <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
