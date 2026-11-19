import { redirect } from "next/navigation";

/** The demand view moved into the club dashboard; keep old links working. */
export default async function DemandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/club/${id}#enquiries`);
}
