import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

// cacheComponents is off: almost every screen reads the Supabase session,
// so we use the request-time model. See DECISIONS.md.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  // Photo uploads (5 MB) and licence documents (10 MB) go through server actions.
  experimental: {
    serverActions: { bodySizeLimit: "11mb" },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default withNextIntl(nextConfig);
