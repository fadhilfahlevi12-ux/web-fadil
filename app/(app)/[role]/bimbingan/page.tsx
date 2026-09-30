import { redirect } from "next/navigation";

import type { Role } from "@/db/schema";
import { BimbinganDosenView } from "@/components/thesis/bimbingan-dosen-view";

/**
 * Menu Bimbingan (khusus dosen). Isi halaman ada di
 * `components/thesis/bimbingan-dosen-view.tsx`.
 */
export default async function BimbinganModulePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if ((role as Role) !== "dosen") {
    redirect(`/${role}`);
  }

  return <BimbinganDosenView />;
}
