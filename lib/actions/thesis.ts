"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { thesisSubmissions, users, type Role } from "@/db/schema";
import { requireRole } from "@/lib/dal";

/**
 * Server action modul Administrasi Tugas Akhir / Skripsi (PRD §3B).
 * Alur: mahasiswa mengusulkan judul (pending) → Kaprodi menyetujui/menolak →
 * Kaprodi menetapkan Dosen Pembimbing 1 & 2.
 */

export type ThesisActionState = { error?: string; success?: string };

const TITLE_MIN = 10;
const TITLE_MAX = 300;
const SUMMARY_MIN = 20;
const SUMMARY_MAX = 3000;
const REJECT_REASON_MAX = 500;

const PEMBIMBING_ROLES: Role[] = ["dosen", "kaprodi"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_RE.test(value);
}

function revalidateThesis() {
  revalidatePath("/mahasiswa/skripsi");
  revalidatePath("/kaprodi/skripsi");
  revalidatePath("/mahasiswa");
  revalidatePath("/kaprodi");
}

/** Mahasiswa mengusulkan judul skripsi baru. */
export async function submitThesis(
  _prev: ThesisActionState,
  formData: FormData
): Promise<ThesisActionState> {
  const user = await requireRole("mahasiswa");

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();

  if (title.length < TITLE_MIN) {
    return { error: `Judul minimal ${TITLE_MIN} karakter.` };
  }
  if (title.length > TITLE_MAX) {
    return { error: `Judul maksimal ${TITLE_MAX} karakter.` };
  }
  if (summary.length < SUMMARY_MIN) {
    return { error: `Ringkasan minimal ${SUMMARY_MIN} karakter.` };
  }
  if (summary.length > SUMMARY_MAX) {
    return { error: `Ringkasan maksimal ${SUMMARY_MAX} karakter.` };
  }

  // Satu mahasiswa hanya boleh punya satu usulan aktif.
  const active = await db
    .select({ id: thesisSubmissions.id })
    .from(thesisSubmissions)
    .where(
      and(
        eq(thesisSubmissions.userId, user.id),
        inArray(thesisSubmissions.status, ["pending", "approved"])
      )
    )
    .limit(1);

  if (active.length > 0) {
    return {
      error:
        "Anda masih memiliki usulan judul yang sedang diproses atau sudah disetujui.",
    };
  }

  await db.insert(thesisSubmissions).values({
    userId: user.id,
    title,
    summary,
  });

  revalidateThesis();
  return {
    success: "Usulan judul terkirim dan menunggu persetujuan Kaprodi.",
  };
}

/** Kaprodi menyetujui atau menolak usulan judul. */
export async function decideThesis(
  _prev: ThesisActionState,
  formData: FormData
): Promise<ThesisActionState> {
  const user = await requireRole("kaprodi");

  const thesisId = String(formData.get("thesisId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!isUuid(thesisId)) {
    return { error: "ID pengajuan tidak valid." };
  }
  if (decision !== "approve" && decision !== "reject") {
    return { error: "Keputusan tidak valid." };
  }
  if (decision === "reject" && !reason) {
    return { error: "Alasan penolakan wajib diisi." };
  }
  if (reason.length > REJECT_REASON_MAX) {
    return { error: `Alasan maksimal ${REJECT_REASON_MAX} karakter.` };
  }

  const [updated] = await db
    .update(thesisSubmissions)
    .set({
      status: decision === "approve" ? "approved" : "rejected",
      decidedById: user.id,
      decidedAt: new Date(),
      rejectionReason: decision === "reject" ? reason : null,
    })
    .where(
      and(
        eq(thesisSubmissions.id, thesisId),
        eq(thesisSubmissions.status, "pending")
      )
    )
    .returning({ id: thesisSubmissions.id });

  if (!updated) {
    return { error: "Usulan tidak ditemukan atau sudah diputuskan." };
  }

  revalidateThesis();
  return {
    success:
      decision === "approve"
        ? "Judul disetujui. Silakan tetapkan Dosen Pembimbing 1 dan 2."
        : "Usulan judul ditolak.",
  };
}

/** Kaprodi menetapkan Dosen Pembimbing 1 & 2 untuk judul yang disetujui. */
export async function assignPembimbing(
  _prev: ThesisActionState,
  formData: FormData
): Promise<ThesisActionState> {
  await requireRole("kaprodi");

  const thesisId = String(formData.get("thesisId") ?? "").trim();
  const pembimbing1Id = String(formData.get("pembimbing1Id") ?? "").trim();
  const pembimbing2Id =
    String(formData.get("pembimbing2Id") ?? "").trim() || null;

  if (!isUuid(thesisId)) {
    return { error: "ID pengajuan tidak valid." };
  }
  if (!isUuid(pembimbing1Id)) {
    return { error: "Dosen Pembimbing 1 wajib dipilih." };
  }
  if (pembimbing2Id && !isUuid(pembimbing2Id)) {
    return { error: "Dosen Pembimbing 2 tidak valid." };
  }
  if (pembimbing2Id && pembimbing2Id === pembimbing1Id) {
    return { error: "Pembimbing 1 dan Pembimbing 2 tidak boleh orang yang sama." };
  }

  const wanted = pembimbing2Id
    ? [pembimbing1Id, pembimbing2Id]
    : [pembimbing1Id];

  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(inArray(users.id, wanted), inArray(users.role, PEMBIMBING_ROLES))
    );

  if (found.length !== wanted.length) {
    return { error: "Dosen pembimbing tidak valid atau bukan dosen aktif." };
  }

  const [updated] = await db
    .update(thesisSubmissions)
    .set({
      pembimbing1Id,
      pembimbing2Id,
      pembimbingAssignedAt: new Date(),
    })
    .where(
      and(
        eq(thesisSubmissions.id, thesisId),
        eq(thesisSubmissions.status, "approved")
      )
    )
    .returning({ id: thesisSubmissions.id });

  if (!updated) {
    return { error: "Judul belum disetujui atau pengajuan tidak ditemukan." };
  }

  revalidateThesis();
  return { success: "Dosen pembimbing berhasil ditetapkan." };
}
