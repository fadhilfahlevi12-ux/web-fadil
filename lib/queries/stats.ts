import "server-only";

import { and, count, eq, gte, inArray, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  archiveDocuments,
  letterRequests,
  seminarSchedules,
  thesisSubmissions,
  users,
  THESIS_STATUS_LABELS,
  type Role,
  type ThesisStatus,
} from "@/db/schema";

/**
 * Lapisan query agregat untuk dasbor & laporan (PRD §3D).
 * Semua fungsi di sini hanya boleh dipanggil dari Server Component /
 * Server Action, karena memakai koneksi database langsung.
 */

/** Kunci metrik yang dipakai kartu statistik di dasbor/laporan tiap role. */
export type StatKey =
  // Mahasiswa
  | "letters_in_process"
  | "letters_done"
  | "thesis_total"
  | "notifications_recent"
  // Admin
  | "letters_pending_staff"
  | "letters_pending_kaprodi"
  | "archive_total"
  | "users_total"
  | "letters_this_month"
  // Kaprodi / Dosen
  | "thesis_pending"
  | "letters_approved"
  | "thesis_supervised"
  | "archive_sk_mengajar"
  | "seminars_upcoming";

export type StatBundle = Partial<Record<StatKey, number>>;

export type ChartPoint = { label: string; value: number };

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const RECENT_WINDOW_DAYS = 30;

/** N bulan terakhir (termasuk bulan berjalan) sebagai bucket grafik. */
function recentMonths(total = 6): { key: string; label: string; start: Date }[] {
  const now = new Date();
  const buckets: { key: string; label: string; start: Date }[] = [];

  for (let offset = total - 1; offset >= 0; offset -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      label: `${MONTH_SHORT[start.getMonth()]} ${String(start.getFullYear()).slice(2)}`,
      start,
    });
  }
  return buckets;
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Jumlah pengajuan surat per bulan (6 bulan terakhir, bulan kosong = 0). */
export async function lettersByMonth(total = 6): Promise<ChartPoint[]> {
  const buckets = recentMonths(total);
  const since = buckets[0].start;

  const rows = await db
    .select({
      bucket: sql<string>`to_char(date_trunc('month', ${letterRequests.createdAt}), 'YYYY-MM')`,
      value: count(),
    })
    .from(letterRequests)
    .where(gte(letterRequests.createdAt, since))
    .groupBy(sql`date_trunc('month', ${letterRequests.createdAt})`);

  const map = new Map(rows.map((row) => [row.bucket, Number(row.value)]));
  return buckets.map((bucket) => ({
    label: bucket.label,
    value: map.get(bucket.key) ?? 0,
  }));
}

/** Statistik dasbor role Mahasiswa. */
async function statsMahasiswa(userId: string): Promise<StatBundle> {
  const [inProcess] = await db
    .select({ value: count() })
    .from(letterRequests)
    .where(
      and(
        eq(letterRequests.userId, userId),
        inArray(letterRequests.status, ["pending_staff", "pending_kaprodi"])
      )
    );

  const [done] = await db
    .select({ value: count() })
    .from(letterRequests)
    .where(
      and(
        eq(letterRequests.userId, userId),
        eq(letterRequests.status, "approved")
      )
    );

  const [thesis] = await db
    .select({ value: count() })
    .from(thesisSubmissions)
    .where(eq(thesisSubmissions.userId, userId));

  const [recent] = await db
    .select({ value: count() })
    .from(letterRequests)
    .where(
      and(
        eq(letterRequests.userId, userId),
        inArray(letterRequests.status, ["approved", "rejected"]),
        gte(letterRequests.updatedAt, daysAgo(RECENT_WINDOW_DAYS))
      )
    );

  return {
    letters_in_process: inProcess.value,
    letters_done: done.value,
    thesis_total: thesis.value,
    notifications_recent: recent.value,
  };
}

/** Statistik dasbor role Staf Administrasi. */
async function statsAdmin(): Promise<StatBundle> {
  const [pendingStaff] = await db
    .select({ value: count() })
    .from(letterRequests)
    .where(eq(letterRequests.status, "pending_staff"));

  const [pendingKaprodi] = await db
    .select({ value: count() })
    .from(letterRequests)
    .where(eq(letterRequests.status, "pending_kaprodi"));

  const [archives] = await db
    .select({ value: count() })
    .from(archiveDocuments);

  const [userTotal] = await db.select({ value: count() }).from(users);

  // Dipakai juga oleh halaman Laporan & Rekap (PRD §3D).
  const [approved] = await db
    .select({ value: count() })
    .from(letterRequests)
    .where(eq(letterRequests.status, "approved"));

  const [thesis] = await db
    .select({ value: count() })
    .from(thesisSubmissions);

  return {
    letters_pending_staff: pendingStaff.value,
    letters_pending_kaprodi: pendingKaprodi.value,
    archive_total: archives.value,
    users_total: userTotal.value,
    letters_approved: approved.value,
    thesis_total: thesis.value,
  };
}

/** Statistik dasbor role Kaprodi. */
async function statsKaprodi(userId: string): Promise<StatBundle> {
  const [pendingTtd] = await db
    .select({ value: count() })
    .from(letterRequests)
    .where(eq(letterRequests.status, "pending_kaprodi"));

  const [thesisPending] = await db
    .select({ value: count() })
    .from(thesisSubmissions)
    .where(eq(thesisSubmissions.status, "pending"));

  const [approved] = await db
    .select({ value: count() })
    .from(letterRequests)
    .where(eq(letterRequests.status, "approved"));

  const [supervised] = await db
    .select({ value: count() })
    .from(thesisSubmissions)
    .where(
      or(
        eq(thesisSubmissions.pembimbing1Id, userId),
        eq(thesisSubmissions.pembimbing2Id, userId)
      )
    );

  return {
    letters_pending_kaprodi: pendingTtd.value,
    thesis_pending: thesisPending.value,
    letters_approved: approved.value,
    thesis_supervised: supervised.value,
  };
}

/** Statistik dasbor role Dosen (modul pengembangan). */
async function statsDosen(userId: string): Promise<StatBundle> {
  const [skMengajar] = await db
    .select({ value: count() })
    .from(archiveDocuments)
    .where(eq(archiveDocuments.category, "sk_mengajar"));

  const [supervised] = await db
    .select({ value: count() })
    .from(thesisSubmissions)
    .where(
      or(
        eq(thesisSubmissions.pembimbing1Id, userId),
        eq(thesisSubmissions.pembimbing2Id, userId)
      )
    );

  const [upcoming] = await db
    .select({ value: count() })
    .from(seminarSchedules)
    .where(gte(seminarSchedules.heldAt, new Date()));

  return {
    archive_sk_mengajar: skMengajar.value,
    thesis_supervised: supervised.value,
    seminars_upcoming: upcoming.value,
  };
}

/** Ambil bundel statistik yang relevan untuk role pengguna. */
export async function getDashboardStats(user: {
  id: string;
  role: Role;
}): Promise<StatBundle> {
  switch (user.role) {
    case "mahasiswa":
      return statsMahasiswa(user.id);
    case "admin":
      return statsAdmin();
    case "kaprodi":
      return statsKaprodi(user.id);
    case "dosen":
      return statsDosen(user.id);
    default:
      return {};
  }
}

/** Jumlah pengajuan surat pada bulan berjalan. */
async function lettersThisMonth(): Promise<number> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [row] = await db
    .select({ value: count() })
    .from(letterRequests)
    .where(
      and(
        gte(letterRequests.createdAt, start),
        lt(letterRequests.createdAt, next)
      )
    );

  return row.value;
}

export type LaporanData = {
  stats: StatBundle;
  lettersByMonth: ChartPoint[];
  thesisByStatus: ChartPoint[];
};

/**
 * Data halaman Laporan & Rekap (PRD §3D): kartu statistik + dua grafik.
 * Statistik per role diambil dari bundel dasbor agar tidak ada duplikasi query.
 */
export async function getLaporanStats(user: {
  id: string;
  role: Role;
}): Promise<LaporanData> {
  const [stats, monthly, byStatus, thisMonth] = await Promise.all([
    getDashboardStats(user),
    lettersByMonth(),
    thesisByStatus(),
    lettersThisMonth(),
  ]);

  return {
    stats: { ...stats, letters_this_month: thisMonth },
    lettersByMonth: monthly,
    thesisByStatus: byStatus,
  };
}

/** Sebaran status pengajuan skripsi (semua data, untuk pie/bar breakdown). */
export async function thesisByStatus(): Promise<ChartPoint[]> {
  const rows = await db
    .select({ status: thesisSubmissions.status, value: count() })
    .from(thesisSubmissions)
    .groupBy(thesisSubmissions.status);

  const map = new Map(rows.map((row) => [row.status, Number(row.value)]));
  return (Object.keys(THESIS_STATUS_LABELS) as ThesisStatus[]).map((status) => ({
    label: THESIS_STATUS_LABELS[status],
    value: map.get(status) ?? 0,
  }));
}
