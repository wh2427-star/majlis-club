import { getMyClubs } from "@/lib/data/queries";
import { requireClubAccess } from "@/lib/services/club";
import { ClubTabs } from "@/components/club/ClubTabs";

export default async function ClubLayout({ children, params }: LayoutProps<"/club/[id]">) {
  const { id } = await params;
  await requireClubAccess(id, `/club/${id}`);
  const clubs = await getMyClubs();
  return (
    <>
      <ClubTabs clubId={id} clubs={clubs.map((c) => ({ id: c.id, name: c.name }))} />
      {children}
    </>
  );
}
