import type {
  ArchiveCategory,
  LetterStatus,
  LetterType,
  Role,
  SeminarType,
  ThesisStatus,
} from "@/db/schema";

/**
 * Tipe data bersama untuk ekspor laporan (PRD §3D).
 *
 * Modul ini sengaja bebas dari `server-only`, koneksi database, dan pustaka
 * pembuat berkas, sehingga dapat dipakai oleh:
 * - `lib/reports/laporan-data.ts` (query database, server-only),
 * - `lib/reports/laporan-xlsx.ts` & `laporan-pdf.ts` (pembuat berkas),
 * - `scripts/laporan-check.ts` (pemeriksa mandiri tanpa database).
 */

export type LaporanMetric = { label: string; value: number };
export type LaporanPoint = { label: string; value: number };

export type LaporanSuratRow = {
  createdAt: Date;
  documentNumber: string | null;
  studentName: string;
  studentNim: string | null;
  letterType: LetterType;
  purpose: string;
  destination: string | null;
  status: LetterStatus;
  approvedAt: Date | null;
  signerName: string | null;
  qrToken: string | null;
  documentUrl: string | null;
};

export type LaporanThesisRow = {
  createdAt: Date;
  studentName: string;
  studentNim: string | null;
  title: string;
  status: ThesisStatus;
  pembimbing1: string | null;
  pembimbing2: string | null;
  decidedAt: Date | null;
};

export type LaporanArchiveRow = {
  createdAt: Date;
  category: ArchiveCategory;
  title: string;
  academicYear: string | null;
  fileUrl: string;
};

export type LaporanSeminarRow = {
  heldAt: Date;
  seminarType: SeminarType;
  studentName: string | null;
  studentNim: string | null;
  thesisTitle: string | null;
  location: string | null;
  upcoming: boolean;
};

export type LaporanExport = {
  role: Role;
  roleLabel: string;
  generatedAt: Date;
  metrics: LaporanMetric[];
  lettersByMonth: LaporanPoint[];
  thesisByStatus: LaporanPoint[];
  letters: LaporanSuratRow[];
  theses: LaporanThesisRow[];
  archives: LaporanArchiveRow[];
  seminars: LaporanSeminarRow[];
};

export const ROLE_REPORT_LABEL: Record<Role, string> = {
  admin: "Staf Administrasi Prodi",
  kaprodi: "Ketua Program Studi",
  dosen: "Dosen",
  mahasiswa: "Mahasiswa",
};

/** Judul laporan yang tampil pada berkas ekspor. */
export const LAPORAN_TITLE = "Laporan & Rekap Administrasi Prodi";

/** Kop instansi pada berkas ekspor. */
export const LAPORAN_HEADER = [
  "UNIVERSITAS MUHAMMADIYAH PAREPARE",
  "FAKULTAS TEKNIK — PROGRAM STUDI TEKNIK INFORMATIKA",
] as const;
