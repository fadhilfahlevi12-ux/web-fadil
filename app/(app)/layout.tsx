import type { ReactNode } from "react";

import { requireUser } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { ROLE_NAV } from "@/lib/navigation";
import { listNotifications } from "@/lib/queries/notifications";
import { AppShell } from "@/components/app-shell";
import type { NotificationItem } from "@/components/notification-bell";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Semua halaman dalam group (app) butuh sesi login.
  const user = await requireUser();

  // Notifikasi header (PRD §3A) dihitung per permintaan dari keadaan basis data.
  const notifications = await listNotifications({ id: user.id, role: user.role });
  const notificationItems: NotificationItem[] = notifications.map((item) => ({
    id: item.id,
    title: item.title,
    detail: item.detail,
    href: item.href,
    tone: item.tone,
    atLabel: formatDateTime(item.at),
  }));

  return (
    <AppShell
      role={user.role}
      userName={user.name ?? user.email ?? "Pengguna"}
      userEmail={user.email ?? ""}
      navGroups={ROLE_NAV[user.role]}
      notifications={notificationItems}
    >
      {children}
    </AppShell>
  );
}
