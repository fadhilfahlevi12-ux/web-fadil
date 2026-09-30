import "server-only";

import { desc, eq, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import {
  seminarSchedules,
  thesisSubmissions,
  users,
  type SeminarType,
  type ThesisStatus,
} from "@/db/schema";

/**
 * Query modul Bimbingan Dosen (PRD §2 & §3B).
 *
 * Dosen melihat mahasiswa yang ditetapkan Kaprodi sebagai bimbingannya
 * (Pembimbing 1 atau 2) beserta jadwal seminar terkait. Penetapan bersifat
 * otomatis dari modul skripsi, sehingga tidak ada permintaan persetujuan
 * terpisah yang perlu disimpan.
 */

export type BimbinganSeminarRow = {
  id: string;
  seminarType: SeminarType;
  heldAt: Date;
  location: string | null;
  notes: string | null;
  upcoming: boolean;
};

export type BimbinganRow = {
  thesisId: string;
  studentName: string;
  studentNim: string | null;
  title: string;
  summary: string;
  status: ThesisStatus;
  asPembimbing1: boolean;
  assignedAt: Date | null;
  seminars: BimbinganSeminarRow[];
};

/** Mahasiswa bimbingan seorang dosen (sebagai Pembimbing 1 atau 2). */
export async function listBimbingan(dosenId: string): Promise<BimbinganRow[]> {
  const thesisRows = await db
    .select({
      id: thesisSubmissions.id,
      title: thesisSubmissions.title,
      summary: thesisSubmissions.summary,
      status: thesisSubmissions.status,
      pembimbing1Id: thesisSubmissions.pembimbing1Id,
      assignedAt: thesisSubmissions.pembimbingAssignedAt,
      studentName: users.name,
      studentNim: users.nim,
    })
    .from(thesisSubmissions)
    .innerJoin(users, eq(thesisSubmissions.userId, users.id))
    .where(
      or(
        eq(thesisSubmissions.pembimbing1Id, dosenId),
        eq(thesisSubmissions.pembimbing2Id, dosenId)
      )
    )
    .orderBy(
      desc(thesisSubmissions.pembimbingAssignedAt),
      desc(thesisSubmissions.createdAt)
    );

  if (thesisRows.length === 0) return [];

  const seminarRows = await db
    .select({
      id: seminarSchedules.id,
      thesisSubmissionId: seminarSchedules.thesisSubmissionId,
      seminarType: seminarSchedules.seminarType,
      heldAt: seminarSchedules.heldAt,
      location: seminarSchedules.location,
      notes: seminarSchedules.notes,
    })
    .from(seminarSchedules)
    .where(
      inArray(
        seminarSchedules.thesisSubmissionId,
        thesisRows.map((row) => row.id)
      )
    )
    .orderBy(desc(seminarSchedules.heldAt));

  const now = Date.now();
  const byThesis = new Map<string, BimbinganSeminarRow[]>();

  for (const row of seminarRows) {
    if (!row.thesisSubmissionId) continue;
    const list = byThesis.get(row.thesisSubmissionId) ?? [];
    list.push({
      id: row.id,
      seminarType: row.seminarType,
      heldAt: row.heldAt,
      location: row.location,
      notes: row.notes,
      upcoming: row.heldAt.getTime() >= now,
    });
    byThesis.set(row.thesisSubmissionId, list);
  }

  return thesisRows.map((row) => ({
    thesisId: row.id,
    studentName: row.studentName,
    studentNim: row.studentNim,
    title: row.title,
    summary: row.summary,
    status: row.status,
    asPembimbing1: row.pembimbing1Id === dosenId,
    assignedAt: row.assignedAt,
    seminars: byThesis.get(row.id) ?? [],
  }));
}
