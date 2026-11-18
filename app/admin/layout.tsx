import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { counts, requireAdmin } from "@/lib/services/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin("/admin");
  const [t, c] = await Promise.all([getTranslations("admin"), counts()]);
  const links: [string, string, number | null][] = [
    ["/admin/licences", t("licences"), c.licences],
    ["/admin/photos", t("photos"), c.reports],
    ["/admin/approvals", t("approvals"), c.approvals],
    ["/admin/coverage", t("coverage"), null],
  ];
  return (
    <>
      <nav aria-label={t("title")} className="mb-4">
        <ul className="flex flex-wrap gap-x-4">
          {links.map(([href, label, n]) => (
            <li key={href}>
              <Link href={href} className="inline-flex min-h-tap items-center underline underline-offset-4">
                {label}
                {n != null ? ` (${t("pendingCount", { count: n })})` : ""}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </>
  );
}
