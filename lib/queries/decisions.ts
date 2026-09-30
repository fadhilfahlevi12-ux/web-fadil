import "server-only";

import { and, desc, eq, isNotNull, or } from "drizzle-orm";

import { db } from "@/db";
import {
  LETTER_TYPE_LABELS,
  letterRequests,
  thesisSubmissions,
  users,
} from "@/db/schema";

/**
 * Riwayat keputusan Kaprodi (PRD §3B) — surat ber-TTD dan usulan judul.
 * Dipakai kartu "Riwayat Keputusan" pada dasbor Kaprodi.
 *
 * Surat yang ditolak staf (belum diverifikasi) tidak dihitung sebagai
 * keputusan Kaprodi, karena penolakan tersebut terjadi sebelum masuk antrian
 * tanda tangan.
 */

export type DecisionOutcome = "approved" | "rejected";

export type DecisionRow = {
  id: string;
  kind: "letter" | "thesis";
  subject: string;
  title: string;
  outcome: DecisionOutcome;
  note: string | null;
  at: Date;
};

/** Keputusan terakhir yang diambil seorang Kaprodi. */
export async function listKaprodiDecisions(
  kaprodiId: string,
  limit = 6
): Promise<DecisionRow[]> {
  const [letterRows, thesisRows] = await Promise.all([
    db
      .select({
        id: letterRequests.id,
        letterType: letterRequests.letterType,
        status: letterRequests.status,
        documentNumber: letterRequests.documentNumber,
        rejectionReason: letterRequests.rejectionReason,
        approvedAt: letterRequests.approvedAt,
        updatedAt: letterRequests.updatedAt,
        studentName: users.name,
      })
      .from(letterRequests)
      .innerJoin(users, eq(letterRequests.userId, users.id))
      .where(
        or(
          eq(letterRequests.status, "approved"),
          and(
            eq(letterRequests.status, "rejected"),
            isNotNull(letterRequests.staffVerifiedById)
          )
        )
      )
      .orderBy(desc(letterRequests.updatedAt))
      .limit(20),
    db
      .select({
        id: thesisSubmissions.id,
        title: thesisSubmissions.title,
        status: thesisSubmissions.status,
        rejectionReason: thesisSubmissions.rejectionReason,
        decidedAt: thesisSubmissions.decidedAt,
        studentName: users.name,
      })
      .from(thesisSubmissions)
      .innerJoin(users, eq(thesisSubmissions.userId, users.id))
      .where(
        and(
          eq(thesisSubmissions.decidedById, kaprodiId),
          isNotNull(thesisSubmissions.decidedAt)
        )
      )
      .orderBy(desc(thesisSubmissions.decidedAt))
      .limit(20),
  ]);

  const decisions: DecisionRow[] = [];

  for (const row of letterRows) {
    const approved = row.status === "approved";
    decisions.push({
      id: `letter-${row.id}`,
      kind: "letter",
      subject: row.studentName,
      title: LETTER_TYPE_LABELS[row.letterType],
      outcome: approved ? "approved" : "rejected",
      note: approved ? row.documentNumber : row.rejectionReason,
      at: row.approvedAt ?? row.updatedAt,
    });
  }

  for (const row of thesisRows) {
    if (!row.decidedAt) continue;
    decisions.push({
      id: `thesis-${row.id}`,
      kind: "thesis",
      subject: row.studentName,
      title: row.title,
      outcome: row.status === "approved" ? "approved" : "rejected",
      note: row.status === "approved" ? "Dosen pembimbing ditetapkan" : row.rejectionReason,
      at: row.decidedAt,
    });
  }

  return decisions
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}
