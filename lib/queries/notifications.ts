import "server-only";

import { and, desc, eq, gte, inArray, isNotNull, or } from "drizzle-orm";

import { db } from "@/db";
import {
  LETTER_TYPE_LABELS,
  SEMINAR_TYPE_LABELS,
  letterRequests,
  seminarSchedules,
  thesisSubmissions,
  users,
  type Role,
} from "@/db/schema";
import { formatDateTime } from "@/lib/format";

/**
 * Notifikasi in-app (PRD §3A) — sumber data lonceng di header.
 *
 * Sengaja tanpa tabel notifikasi: daftar diturunkan dari keadaan basis data
 * saat halaman diminta (antrian yang perlu ditindak, keputusan terbaru, jadwal
 * mendatang), sehingga isinya selalu mengikuti status terbaru tanpa perlu
 * penandaan "sudah dibaca".
 */

export type NotificationTone = "info" | "success" | "warn" | "danger";

export type AppNotification = {
  id: string;
  title: string;
  detail: string | null;
  href: string;
  tone: NotificationTone;
  at: Date | null;
};

const RECENT_DAYS = 30;

function recentSince() {
  return new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);
}

function seminarDetail(heldAt: Date, location: string | null) {
  return `${formatDateTime(heldAt)}${location ? ` — ${location}` : ""}`;
}

/** Notifikasi mahasiswa: keputusan surat/skripsi terbaru + jadwal mendatang. */
async function notificationsMahasiswa(
  userId: string
): Promise<AppNotification[]> {
  const items: AppNotification[] = [];

  const letterRows = await db
    .select({
      id: letterRequests.id,
      letterType: letterRequests.letterType,
      status: letterRequests.status,
      documentNumber: letterRequests.documentNumber,
      rejectionReason: letterRequests.rejectionReason,
      approvedAt: letterRequests.approvedAt,
      updatedAt: letterRequests.updatedAt,
    })
    .from(letterRequests)
    .where(
      and(
        eq(letterRequests.userId, userId),
        inArray(letterRequests.status, ["approved", "rejected"]),
        gte(letterRequests.updatedAt, recentSince())
      )
    )
    .orderBy(desc(letterRequests.updatedAt))
    .limit(5);

  for (const row of letterRows) {
    const label = LETTER_TYPE_LABELS[row.letterType];
    items.push(
      row.status === "approved"
        ? {
            id: `letter-approved-${row.id}`,
            title: `Surat selesai: ${label}`,
            detail: row.documentNumber
              ? `Nomor dokumen ${row.documentNumber} — PDF ber-QR siap diunduh.`
              : "PDF ber-QR siap diunduh.",
            href: "/mahasiswa/surat",
            tone: "success",
            at: row.approvedAt ?? row.updatedAt,
          }
        : {
            id: `letter-rejected-${row.id}`,
            title: `Surat ditolak: ${label}`,
            detail: row.rejectionReason
              ? `Alasan: ${row.rejectionReason}`
              : "Lihat keterangan pada halaman pengajuan surat.",
            href: "/mahasiswa/surat",
            tone: "danger",
            at: row.updatedAt,
          }
    );
  }

  const thesisRows = await db
    .select({
      id: thesisSubmissions.id,
      title: thesisSubmissions.title,
      status: thesisSubmissions.status,
      rejectionReason: thesisSubmissions.rejectionReason,
      decidedAt: thesisSubmissions.decidedAt,
    })
    .from(thesisSubmissions)
    .where(
      and(
        eq(thesisSubmissions.userId, userId),
        isNotNull(thesisSubmissions.decidedAt)
      )
    )
    .orderBy(desc(thesisSubmissions.decidedAt))
    .limit(3);

  for (const row of thesisRows) {
    items.push({
      id: `thesis-${row.id}`,
      title:
        row.status === "approved"
          ? "Usulan judul disetujui"
          : "Usulan judul ditolak",
      detail: row.rejectionReason ?? row.title,
      href: "/mahasiswa/skripsi",
      tone: row.status === "approved" ? "success" : "danger",
      at: row.decidedAt,
    });
  }

  for (const row of await upcomingSeminars(2)) {
    items.push({
      id: `seminar-${row.id}`,
      title: `Jadwal ${SEMINAR_TYPE_LABELS[row.seminarType]}`,
      detail: seminarDetail(row.heldAt, row.location),
      href: "/mahasiswa/jadwal",
      tone: "info",
      at: row.heldAt,
    });
  }

  return items;
}

/** Jadwal seminar mendatang (dipakai beberapa role). */
async function upcomingSeminars(limit: number) {
  return db
    .select({
      id: seminarSchedules.id,
      seminarType: seminarSchedules.seminarType,
      heldAt: seminarSchedules.heldAt,
      location: seminarSchedules.location,
    })
    .from(seminarSchedules)
    .where(gte(seminarSchedules.heldAt, new Date()))
    .orderBy(seminarSchedules.heldAt)
    .limit(limit);
}

/** Notifikasi staf administrasi: antrian verifikasi & jadwal mendatang. */
async function notificationsAdmin(): Promise<AppNotification[]> {
  const items: AppNotification[] = [];

  const pendingRows = await db
    .select({
      id: letterRequests.id,
      letterType: letterRequests.letterType,
      createdAt: letterRequests.createdAt,
      studentName: users.name,
    })
    .from(letterRequests)
    .innerJoin(users, eq(letterRequests.userId, users.id))
    .where(eq(letterRequests.status, "pending_staff"))
    .orderBy(desc(letterRequests.createdAt))
    .limit(5);

  for (const row of pendingRows) {
    items.push({
      id: `letter-pending-${row.id}`,
      title: `Pengajuan baru: ${LETTER_TYPE_LABELS[row.letterType]}`,
      detail: `${row.studentName} — menunggu verifikasi berkas.`,
      href: "/admin/surat",
      tone: "warn",
      at: row.createdAt,
    });
  }

  const readyRows = await db
    .select({
      id: letterRequests.id,
      letterType: letterRequests.letterType,
      verifiedAt: letterRequests.verifiedAt,
      studentName: users.name,
    })
    .from(letterRequests)
    .innerJoin(users, eq(letterRequests.userId, users.id))
    .where(eq(letterRequests.status, "pending_kaprodi"))
    .orderBy(desc(letterRequests.verifiedAt))
    .limit(3);

  for (const row of readyRows) {
    items.push({
      id: `letter-ready-${row.id}`,
      title: `Sudah diverifikasi: ${LETTER_TYPE_LABELS[row.letterType]}`,
      detail: `${row.studentName} — menunggu tanda tangan Kaprodi.`,
      href: "/admin/surat",
      tone: "info",
      at: row.verifiedAt,
    });
  }

  for (const row of await upcomingSeminars(2)) {
    items.push({
      id: `seminar-${row.id}`,
      title: `Jadwal ${SEMINAR_TYPE_LABELS[row.seminarType]} mendatang`,
      detail: seminarDetail(row.heldAt, row.location),
      href: "/admin/jadwal",
      tone: "info",
      at: row.heldAt,
    });
  }

  return items;
}

/** Notifikasi Kaprodi: antrian keputusan & surat yang baru disetujui. */
async function notificationsKaprodi(userId: string): Promise<AppNotification[]> {
  const items: AppNotification[] = [];

  const ttdRows = await db
    .select({
      id: letterRequests.id,
      letterType: letterRequests.letterType,
      purpose: letterRequests.purpose,
      verifiedAt: letterRequests.verifiedAt,
      studentName: users.name,
    })
    .from(letterRequests)
    .innerJoin(users, eq(letterRequests.userId, users.id))
    .where(eq(letterRequests.status, "pending_kaprodi"))
    .orderBy(desc(letterRequests.verifiedAt))
    .limit(5);

  for (const row of ttdRows) {
    items.push({
      id: `letter-ttd-${row.id}`,
      title: `Menunggu tanda tangan: ${LETTER_TYPE_LABELS[row.letterType]}`,
      detail: `${row.studentName} — ${row.purpose}`,
      href: "/kaprodi/surat",
      tone: "warn",
      at: row.verifiedAt,
    });
  }

  const thesisRows = await db
    .select({
      id: thesisSubmissions.id,
      title: thesisSubmissions.title,
      createdAt: thesisSubmissions.createdAt,
      studentName: users.name,
    })
    .from(thesisSubmissions)
    .innerJoin(users, eq(thesisSubmissions.userId, users.id))
    .where(eq(thesisSubmissions.status, "pending"))
    .orderBy(desc(thesisSubmissions.createdAt))
    .limit(3);

  for (const row of thesisRows) {
    items.push({
      id: `thesis-pending-${row.id}`,
      title: "Usulan judul menunggu keputusan",
      detail: `${row.studentName} — ${row.title}`,
      href: "/kaprodi/skripsi",
      tone: "warn",
      at: row.createdAt,
    });
  }

  const recentRows = await db
    .select({
      id: letterRequests.id,
      letterType: letterRequests.letterType,
      documentNumber: letterRequests.documentNumber,
      approvedAt: letterRequests.approvedAt,
      studentName: users.name,
    })
    .from(letterRequests)
    .innerJoin(users, eq(letterRequests.userId, users.id))
    .where(
      and(
        eq(letterRequests.kaprodiApprovedById, userId),
        eq(letterRequests.status, "approved"),
        gte(letterRequests.approvedAt, recentSince())
      )
    )
    .orderBy(desc(letterRequests.approvedAt))
    .limit(3);

  for (const row of recentRows) {
    items.push({
      id: `letter-approved-${row.id}`,
      title: `Surat disetujui: ${LETTER_TYPE_LABELS[row.letterType]}`,
      detail: `${row.documentNumber ?? "Nomor terbit"} — ${row.studentName}`,
      href: "/kaprodi/surat",
      tone: "success",
      at: row.approvedAt,
    });
  }

  return items;
}

/** Notifikasi dosen: mahasiswa bimbingan baru & seminar bimbingannya. */
async function notificationsDosen(userId: string): Promise<AppNotification[]> {
  const items: AppNotification[] = [];

  const assignedRows = await db
    .select({
      id: thesisSubmissions.id,
      title: thesisSubmissions.title,
      assignedAt: thesisSubmissions.pembimbingAssignedAt,
      studentName: users.name,
    })
    .from(thesisSubmissions)
    .innerJoin(users, eq(thesisSubmissions.userId, users.id))
    .where(
      and(
        or(
          eq(thesisSubmissions.pembimbing1Id, userId),
          eq(thesisSubmissions.pembimbing2Id, userId)
        ),
        isNotNull(thesisSubmissions.pembimbingAssignedAt),
        gte(thesisSubmissions.pembimbingAssignedAt, recentSince())
      )
    )
    .orderBy(desc(thesisSubmissions.pembimbingAssignedAt))
    .limit(3);

  for (const row of assignedRows) {
    items.push({
      id: `bimbingan-${row.id}`,
      title: "Mahasiswa bimbingan baru",
      detail: `${row.studentName} — ${row.title}`,
      href: "/dosen/bimbingan",
      tone: "info",
      at: row.assignedAt,
    });
  }

  const seminarRows = await db
    .select({
      id: seminarSchedules.id,
      seminarType: seminarSchedules.seminarType,
      heldAt: seminarSchedules.heldAt,
      location: seminarSchedules.location,
      studentName: users.name,
    })
    .from(seminarSchedules)
    .innerJoin(
      thesisSubmissions,
      eq(seminarSchedules.thesisSubmissionId, thesisSubmissions.id)
    )
    .innerJoin(users, eq(thesisSubmissions.userId, users.id))
    .where(
      and(
        or(
          eq(thesisSubmissions.pembimbing1Id, userId),
          eq(thesisSubmissions.pembimbing2Id, userId)
        ),
        gte(seminarSchedules.heldAt, new Date())
      )
    )
    .orderBy(seminarSchedules.heldAt)
    .limit(2);

  for (const row of seminarRows) {
    items.push({
      id: `seminar-${row.id}`,
      title: `Seminar ${SEMINAR_TYPE_LABELS[row.seminarType]} mahasiswa bimbingan`,
      detail: `${seminarDetail(row.heldAt, row.location)} — ${row.studentName}`,
      href: "/dosen/bimbingan",
      tone: "info",
      at: row.heldAt,
    });
  }

  return items;
}

/**
 * Notifikasi relevan untuk pengguna, terbaru lebih dahulu.
 * Dipakai lonceng pada header (`components/notification-bell.tsx`).
 */
export async function listNotifications(
  user: { id: string; role: Role },
  limit = 8
): Promise<AppNotification[]> {
  const items = await (async () => {
    switch (user.role) {
      case "mahasiswa":
        return notificationsMahasiswa(user.id);
      case "admin":
        return notificationsAdmin();
      case "kaprodi":
        return notificationsKaprodi(user.id);
      case "dosen":
        return notificationsDosen(user.id);
      default:
        return [];
    }
  })();

  return items
    .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
    .slice(0, limit);
}
