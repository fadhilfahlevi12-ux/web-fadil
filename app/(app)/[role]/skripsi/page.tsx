import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { ThesisKaprodiView } from "@/components/thesis/thesis-kaprodi-view";
import { ThesisMahasiswaView } from "@/components/thesis/thesis-mahasiswa-view";

/**
 * Modul Administrasi Tugas Akhir / Skripsi (PRD §3B).
 * Mahasiswa mengusulkan judul; Kaprodi menyetujui dan menetapkan pembimbing.
 */
export default async function SkripsiModulePage({
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

  switch (user.role) {
    case "mahasiswa":
      return <ThesisMahasiswaView />;
    case "kaprodi":
      return <ThesisKaprodiView />;
    default:
      redirect(`/${user.role}`);
  }
}

