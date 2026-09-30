import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { requireUser } from "@/lib/dal";

/**
 * Layout pengaman per segmen role.
 * URL /<role>/... hanya boleh diakses oleh pengguna dengan role yang sama,
 * sehingga Mahasiswa tidak bisa membuka halaman /kaprodi/... dan sebaliknya.
 */
export default async function RoleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ role: string }>;
}) {
  const user = await requireUser();
  const { role } = await params;

  if (role !== user.role) {
    redirect(`/${user.role}`);
  }

  return <>{children}</>;
}
