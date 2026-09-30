import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { archiveDocuments, letterRequests, thesisSubmissions, users, type Role } from "@/db/schema";
import { listSeminars } from "@/lib/queries/seminars";
import { getLaporanStats, type StatBundle, type StatKey } from "@/lib/queries/stats";
import {
  ROLE_REPORT_LABEL,
  type LaporanExport,
  type LaporanMetric,
} from "@/lib/reports/laporan-types";

/**
 * Lapisan data ekspor laporan (PRD §3D).
 *
 * Semua angka rekap dihitung langsung dari basis data (bukan data contoh) dan
 * dipakai bersama oleh ekspor Excel (`.xlsx`) serta PDF, sehingga kedua berkas
 * selalu memuat isi yang sama.
 */

/** Label manusiawi untuk setiap metrik statistik dasbor. */
const METRIC_LABELS: Partial<Record<StatKey, string>> = {
  letters_in_process: "Surat sedang diproses",
  letters_done: "Surat selesai",
  notifications_recent: "Pembaruan 30 hari terakhir",
  letters_pending_staff: "Menunggu verifikasi staf",
  letters_pending_kaprodi: "Menunggu TTD Kaprodi",
  archive_total: "Dokumen arsip tersimpan",
  users_total: "Total akun pengguna",
  letters_this_month: "Pengajuan surat bulan ini",
  thesis_total: "Total usulan judul skripsi",
  thesis_pending: "Usulan judul belum diputuskan",
  letters_approved: "Surat selesai (ber-TTD)",
  thesis_supervised: "Mahasiswa bimbingan",
  archive_sk_mengajar: "Arsip SK Mengajar",
  seminars_upcoming: "Jadwal seminar mendatang",
};

function metricsFromStats(stats: StatBundle): LaporanMetric[] {
  return (Object.keys(METRIC_LABELS) as StatKey[])
    .filter((key) => stats[key] !== undefined)
    .map((key) => ({
      label: METRIC_LABELS[key] as string,
      value: stats[key] ?? 0,
    }));
}

/** Kumpulkan seluruh data laporan sesuai role pemanggil (admin/kaprodi). */
export async function getLaporanExport(user: {
  id: string;
  role: Role;
}): Promise<LaporanExport> {
  const [stats, userRows, letterRows, thesisRows, archiveRows, seminars] =
    await Promise.all([
      getLaporanStats(user),
      db.select({ id: users.id, name: users.name }).from(users),
      db
        .select({
          createdAt: letterRequests.createdAt,
          documentNumber: letterRequests.documentNumber,
          qrToken: letterRequests.qrToken,
          documentUrl: letterRequests.documentUrl,
          letterType: letterRequests.letterType,
          purpose: letterRequests.purpose,
          destination: letterRequests.destination,
          status: letterRequests.status,
          approvedAt: letterRequests.approvedAt,
          approverId: letterRequests.kaprodiApprovedById,
          studentName: users.name,
          studentNim: users.nim,
        })
        .from(letterRequests)
        .innerJoin(users, eq(letterRequests.userId, users.id))
        .orderBy(desc(letterRequests.createdAt)),
      db
        .select({
          createdAt: thesisSubmissions.createdAt,
          title: thesisSubmissions.title,
          status: thesisSubmissions.status,
          decidedAt: thesisSubmissions.decidedAt,
          pembimbing1Id: thesisSubmissions.pembimbing1Id,
          pembimbing2Id: thesisSubmissions.pembimbing2Id,
          studentName: users.name,
          studentNim: users.nim,
        })
        .from(thesisSubmissions)
        .innerJoin(users, eq(thesisSubmissions.userId, users.id))
        .orderBy(desc(thesisSubmissions.createdAt)),
      db
        .select({
          createdAt: archiveDocuments.createdAt,
          category: archiveDocuments.category,
          title: archiveDocuments.title,
          academicYear: archiveDocuments.academicYear,
          fileUrl: archiveDocuments.fileUrl,
        })
        .from(archiveDocuments)
        .orderBy(desc(archiveDocuments.createdAt)),
      listSeminars(),
    ]);

  const nameById = new Map(userRows.map((row) => [row.id, row.name]));

  return {
    role: user.role,
    roleLabel: ROLE_REPORT_LABEL[user.role],
    generatedAt: new Date(),
    metrics: metricsFromStats(stats.stats),
    lettersByMonth: stats.lettersByMonth,
    thesisByStatus: stats.thesisByStatus,
    letters: letterRows.map((row) => ({
      createdAt: row.createdAt,
      documentNumber: row.documentNumber,
      studentName: row.studentName,
      studentNim: row.studentNim,
      letterType: row.letterType,
      purpose: row.purpose,
      destination: row.destination,
      status: row.status,
      approvedAt: row.approvedAt,
      signerName: row.approverId ? nameById.get(row.approverId) ?? null : null,
      qrToken: row.qrToken,
      documentUrl: row.documentUrl,
    })),
    theses: thesisRows.map((row) => ({
      createdAt: row.createdAt,
      studentName: row.studentName,
      studentNim: row.studentNim,
      title: row.title,
      status: row.status,
      pembimbing1: row.pembimbing1Id
        ? nameById.get(row.pembimbing1Id) ?? null
        : null,
      pembimbing2: row.pembimbing2Id
        ? nameById.get(row.pembimbing2Id) ?? null
        : null,
      decidedAt: row.decidedAt,
    })),
    archives: archiveRows,
    seminars: seminars.map((row) => ({
      heldAt: row.heldAt,
      seminarType: row.seminarType,
      studentName: row.studentName,
      studentNim: row.studentNim,
      thesisTitle: row.thesisTitle,
      location: row.location,
      upcoming: row.upcoming,
    })),
  };
}
