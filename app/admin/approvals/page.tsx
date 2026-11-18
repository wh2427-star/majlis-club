import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { approvalQueue } from "@/lib/services/admin";
import { decideClaimAction, decideClubAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { PageTitle, Section } from "@/components/ui/Misc";

export const metadata = { title: "Approvals" };

export default async function Approvals() {
  const [t, q] = await Promise.all([getTranslations(), approvalQueue()]);
  return (
    <>
      <PageTitle>{t("admin.approvals")}</PageTitle>
      {q.clubs.length + q.claims.length === 0 ? <p>{t("admin.noApprovals")}</p> : null}
      <ul className="flex flex-col gap-3">
        {q.clubs.map((c) => (
          <li key={c.id} className="rounded-card bg-white p-4">
            <p className="font-semibold"><Link href={`/club/${c.id}/edit`}>{c.name}</Link></p>
            <p className="text-sm">{t(`clubType.${c.club_type}`)} · {c.areas?.name}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <form action={decideClubAction} className="flex items-end">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="decision" value="approve" />
                <Button type="submit">{t("admin.approve")}</Button>
              </form>
              <form action={decideClubAction} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="decision" value="reject" />
                <TextField id={`why-${c.id}`} name="reason" required label={t("admin.rejectReason")} />
                <Button type="submit" variant="danger">{t("admin.reject")}</Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      {q.claims.length ? (
        <Section title={t("onboard.claimTitle")} id="claims">
          <ul className="flex flex-col gap-3">
            {q.claims.map((c) => (
              <li key={c.id} className="rounded-card bg-white p-4">
                <p className="font-semibold">{c.clubs?.name}</p>
                {c.note ? <p>{c.note}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["approve", "reject"] as const).map((d) => (
                    <form key={d} action={decideClaimAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="decision" value={d} />
                      <Button type="submit" variant={d === "approve" ? "primary" : "danger"}>{t(d === "approve" ? "admin.approve" : "admin.reject")}</Button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
