import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { listKaprodiDecisions } from "@/lib/queries/decisions";
import { getDashboardStats } from "@/lib/queries/stats";
import {
  RoleDashboard,
  type DecisionListItem,
} from "@/components/dashboard-page";

export default async function RoleHomePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const user = await requireUser();

  // Layout [role] sudah menjamin role sama; ini pengaman ganda.
  if (role !== user.role) {
    redirect(`/${user.role}`);
  }

  // Riwayat keputusan hanya relevan (dan hanya dihitung) untuk Kaprodi.
  const [stats, decisions] = await Promise.all([
    getDashboardStats({ id: user.id, role: user.role }),
    user.role === "kaprodi"
      ? listKaprodiDecisions(user.id)
      : Promise.resolve([]),
  ]);

  const decisionItems: DecisionListItem[] = decisions.map((item) => ({
    id: item.id,
    kind: item.kind,
    subject: item.subject,
    title: item.title,
    outcome: item.outcome,
    note: item.note,
    atLabel: formatDateTime(item.at),
  }));

  return (
    <RoleDashboard
      role={user.role}
      name={user.name ?? user.email ?? "Pengguna"}
      email={user.email ?? ""}
      stats={stats}
      decisions={decisionItems}
    />
  );
}
