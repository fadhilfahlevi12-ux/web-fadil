"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  seminarSchedules,
  seminarTypeEnum,
  thesisSubmissions,
  type SeminarType,
} from "@/db/schema";
import { requireRole } from "@/lib/dal";

/**
 * Server action modul Jadwal Seminar/Ujian (PRD §3B).
 * Staf prodi (admin) mempublikasikan jadwal Seminar Proposal, Hasil, dan
 * Tutup; jadwal tampil untuk mahasiswa dan dihitung pada dasbor dosen.
 */

export type SeminarActionState = { error?: string; success?: string };

const LOCATION_MAX = 150;
const NOTES_MAX = 500;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_RE.test(value);
}

function readSeminarType(
  value: FormDataEntryValue | null
): SeminarType | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw && (seminarTypeEnum.enumValues as readonly string[]).includes(raw)) {
    return raw as SeminarType;
  }
  return null;
}

function revalidateSeminar() {
  revalidatePath("/admin/jadwal");
  revalidatePath("/mahasiswa/jadwal");
  revalidatePath("/admin");
  revalidatePath("/mahasiswa");
  revalidatePath("/dosen");
}

/** Nilai jadwal yang sudah tervalidasi, dipakai publikasi & penyuntingan. */
type SeminarInput = {
  seminarType: SeminarType;
  heldAt: Date;
  location: string | null;
  notes: string | null;
  thesisSubmissionId: string | null;
};

/** Validasi bersama untuk publikasi dan penyuntingan jadwal. */
async function parseSeminarForm(
  formData: FormData
): Promise<{ input: SeminarInput } | { error: string }> {
  const seminarType = readSeminarType(formData.get("seminarType"));
  const heldAtRaw = String(formData.get("heldAt") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const thesisIdRaw = String(formData.get("thesisSubmissionId") ?? "").trim();

  if (!seminarType) {
    return { error: "Jenis seminar tidak valid." };
  }
  if (!heldAtRaw) {
    return { error: "Tanggal dan waktu wajib diisi." };
  }

  const heldAt = new Date(heldAtRaw);
  if (Number.isNaN(heldAt.getTime())) {
    return { error: "Format tanggal dan waktu tidak valid." };
  }
  if (location && location.length > LOCATION_MAX) {
    return { error: `Ruang maksimal ${LOCATION_MAX} karakter.` };
  }
  if (notes && notes.length > NOTES_MAX) {
    return { error: `Keterangan maksimal ${NOTES_MAX} karakter.` };
  }

  let thesisSubmissionId: string | null = null;
  if (thesisIdRaw) {
    if (!isUuid(thesisIdRaw)) {
      return { error: "Mahasiswa terkait tidak valid." };
    }
    const [thesis] = await db
      .select({ id: thesisSubmissions.id })
      .from(thesisSubmissions)
      .where(
        and(
          eq(thesisSubmissions.id, thesisIdRaw),
          eq(thesisSubmissions.status, "approved")
        )
      )
      .limit(1);

    if (!thesis) {
      return {
        error: "Pengajuan skripsi tidak ditemukan atau belum disetujui Kaprodi.",
      };
    }
    thesisSubmissionId = thesis.id;
  }

  return { input: { seminarType, heldAt, location, notes, thesisSubmissionId } };
}

/** Admin mempublikasikan jadwal seminar baru. */
export async function publishSeminar(
  _prev: SeminarActionState,
  formData: FormData
): Promise<SeminarActionState> {
  const user = await requireRole("admin");

  const parsed = await parseSeminarForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  await db.insert(seminarSchedules).values({
    ...parsed.input,
    publishedById: user.id,
  });

  revalidateSeminar();
  return { success: "Jadwal seminar berhasil dipublikasikan." };
}

/** Admin menyunting jadwal seminar yang sudah terpublikasi (PRD §3B). */
export async function updateSeminar(
  _prev: SeminarActionState,
  formData: FormData
): Promise<SeminarActionState> {
  await requireRole("admin");

  const seminarId = String(formData.get("seminarId") ?? "").trim();
  if (!isUuid(seminarId)) {
    return { error: "ID jadwal tidak valid." };
  }

  const parsed = await parseSeminarForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const [updated] = await db
    .update(seminarSchedules)
    .set(parsed.input)
    .where(eq(seminarSchedules.id, seminarId))
    .returning({ id: seminarSchedules.id });

  if (!updated) {
    return { error: "Jadwal tidak ditemukan." };
  }

  revalidateSeminar();
  return { success: "Perubahan jadwal disimpan." };
}

/** Admin menghapus / membatalkan jadwal seminar. */
export async function deleteSeminar(
  _prev: SeminarActionState,
  formData: FormData
): Promise<SeminarActionState> {
  await requireRole("admin");

  const seminarId = String(formData.get("seminarId") ?? "").trim();
  if (!isUuid(seminarId)) {
    return { error: "ID jadwal tidak valid." };
  }

  const [deleted] = await db
    .delete(seminarSchedules)
    .where(eq(seminarSchedules.id, seminarId))
    .returning({ id: seminarSchedules.id });

  if (!deleted) {
    return { error: "Jadwal tidak ditemukan." };
  }

  revalidateSeminar();
  return { success: "Jadwal seminar dihapus." };
}
