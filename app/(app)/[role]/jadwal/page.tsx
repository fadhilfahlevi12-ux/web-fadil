import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { SeminarAdminView } from "@/components/seminar/seminar-admin-view";
import { SeminarMahasiswaView } from "@/components/seminar/seminar-mahasiswa-view";

/**
 * Modul Jadwal Seminar/Ujian (PRD §3B).
 * Staf prodi (admin) mempublikasikan jadwal; mahasiswa melihatnya.
 */
export default async function JadwalModulePage({
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
      return <SeminarMahasiswaView />;
    case "admin":
      return <SeminarAdminView />;
    default:
      redirect(`/${user.role}`);
  }
}



