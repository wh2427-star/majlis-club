/**
 * Single place for the product name and product-level switches.
 * "Majlis Club" is a working title and is not cleared [CONFIRM]; change it here only.
 */
export const appConfig = {
  name: "Majlis Club",
  locale: "en",
  /** Text direction of the active locale. Arabic (rtl) comes later. */
  dir: "ltr" as "ltr" | "rtl",
  /** Paid layer is a stub. Never write billing code behind this flag in v1. */
  paidToolsEnabled: process.env.PAID_TOOLS_ENABLED === "true",
  /** Upgrade prompt shows only when a club's enquiries in the last 30 days reach this. */
  upgradeEnquiryThreshold: Number(process.env.UPGRADE_ENQUIRY_THRESHOLD ?? 10),
  /** Second cluster may open once this share of identified first-cluster clubs are listed. Not automated. */
  clusterOpenShare: 0.25,
  /** Demo builds show a "Demo data" banner. */
  demoData: process.env.NEXT_PUBLIC_DEMO_DATA !== "false",
} as const;
