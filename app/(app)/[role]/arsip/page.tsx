import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import {
  ArchiveAdminView,
  type ArchiveSearchParams,
} from "@/components/archive/archive-admin-view";

/**
 * Modul Arsip Digital Prodi (PRD §3C) — hanya untuk Staf Administrasi.
 * Dukungan pencarian & filter lewat query string (?q=&kategori=&tahun=).
 */

function firstValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ArsipModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { role } = await params;
  const user = await requireUser();

  // Layout [role] sudah menjamin role sama; arsip hanya untuk admin.
  if (role !== user.role || user.role !== "admin") {
    redirect(`/${user.role}`);
  }

  const query = await searchParams;

  const filters: ArchiveSearchParams = {
    q: firstValue(query.q),
    kategori: firstValue(query.kategori),
    tahun: firstValue(query.tahun),
  };

  return <ArchiveAdminView searchParams={filters} />;
}



