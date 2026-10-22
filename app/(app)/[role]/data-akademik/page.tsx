import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import {
  MemberAdminView,
  type MemberSearchParams,
} from "@/components/members/member-admin-view";

/**
 * Modul Data Akademik — hanya untuk Staf Administrasi.
 * Berisi daftar resmi NAMA/NIM mahasiswa dan NAMA/NIDN dosen yang menjadi
 * acuan validasi pendaftaran akun.
 * Dukungan pencarian & filter lewat query string (?q=&jenis=).
 */

function firstValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function DataAkademikPage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { role } = await params;
  const user = await requireUser();

  // Layout [role] sudah menjamin role sama; data akademik hanya untuk admin.
  if (role !== user.role || user.role !== "admin") {
    redirect(`/${user.role}`);
  }

  const query = await searchParams;

  const filters: MemberSearchParams = {
    q: firstValue(query.q),
    jenis: firstValue(query.jenis),
  };

  return <MemberAdminView searchParams={filters} />;
}
