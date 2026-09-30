import { redirect } from "next/navigation";

import type { Role } from "@/db/schema";
import { SuratAdminView } from "@/components/letters/surat-admin-view";
import { SuratDosenView } from "@/components/letters/surat-dosen-view";
import { SuratKaprodiView } from "@/components/letters/surat-kaprodi-view";
import { SuratMahasiswaView } from "@/components/letters/surat-mahasiswa-view";

export default async function SuratModulePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;

  switch (role as Role) {
    case "mahasiswa":
      return <SuratMahasiswaView />;
    case "admin":
      return <SuratAdminView />;
    case "kaprodi":
      return <SuratKaprodiView />;
    case "dosen":
      return <SuratDosenView />;
    default:
      redirect(`/${role}`);
  }
}
