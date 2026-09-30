import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  seminarSchedules,
  thesisSubmissions,
  users,
  type SeminarType,
} from "@/db/schema";

/**
 * Query modul Jadwal Seminar (PRD §3B).
 * Perhitungan waktu (status "mendatang") sengaja diletakkan di lapisan query,
 * bukan di body komponen, agar tidak melanggar aturan purity React Compiler
 * sekaligus menjaga komponen tetap murni.
 */

export type SeminarRow = {
  id: string;
  seminarType: SeminarType;
  heldAt: Date;
  location: string | null;
  notes: string | null;
  thesisSubmissionId: string | null;
  studentId: string | null;
  studentName: string | null;
  studentNim: string | null;
  thesisTitle: string | null;
  upcoming: boolean;
};

/** Seluruh jadwal seminar beserta mahasiswa terkait (bila ada). */
export async function listSeminars(): Promise<SeminarRow[]> {
  const rows = await db
    .select({
      id: seminarSchedules.id,
      seminarType: seminarSchedules.seminarType,
      heldAt: seminarSchedules.heldAt,
      location: seminarSchedules.location,
      notes: seminarSchedules.notes,
      thesisSubmissionId: seminarSchedules.thesisSubmissionId,
      studentId: thesisSubmissions.userId,
      studentName: users.name,
      studentNim: users.nim,
      thesisTitle: thesisSubmissions.title,
    })
    .from(seminarSchedules)
    .leftJoin(
      thesisSubmissions,
      eq(seminarSchedules.thesisSubmissionId, thesisSubmissions.id)
    )
    .leftJoin(users, eq(thesisSubmissions.userId, users.id))
    .orderBy(desc(seminarSchedules.heldAt));

  const now = Date.now();
  return rows.map((row) => ({
    ...row,
    upcoming: new Date(row.heldAt).getTime() >= now,
  }));
}

export type ThesisOption = { id: string; label: string };

/** Pilihan mahasiswa untuk form jadwal: hanya judul yang sudah disetujui. */
export async function listApprovedThesisOptions(): Promise<ThesisOption[]> {
  const rows = await db
    .select({
      id: thesisSubmissions.id,
      title: thesisSubmissions.title,
      studentName: users.name,
      studentNim: users.nim,
    })
    .from(thesisSubmissions)
    .innerJoin(users, eq(thesisSubmissions.userId, users.id))
    .where(eq(thesisSubmissions.status, "approved"))
    .orderBy(desc(thesisSubmissions.decidedAt));

  return rows.map((row) => ({
    id: row.id,
    label: `${row.studentName}${row.studentNim ? ` (${row.studentNim})` : ""} — ${row.title}`,
  }));
}
