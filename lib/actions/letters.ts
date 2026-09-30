"use server";

import { randomUUID } from "crypto";
import { and, count, eq, gte, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import {
  letterRequests,
  letterTypeEnum,
  users,
  type LetterStatus,
  type LetterType,
} from "@/db/schema";
import { requireRole } from "@/lib/dal";
import { verificationUrl } from "@/lib/app-url";
import { buildLetterPdf, letterPdfFileName } from "@/lib/pdf/letter-document";
import { isStorageConfigured, uploadLetterPdf } from "@/lib/storage";

export type LetterActionState = { error?: string; success?: string };

const REJECT_REASON_MAX = 500;

function readLetterType(value: FormDataEntryValue | null): LetterType | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw && (letterTypeEnum.enumValues as readonly string[]).includes(raw)) {
    return raw as LetterType;
  }
  return null;
}

function rejectPaths(role: string) {
  return role === "admin"
    ? ["/admin/surat", "/mahasiswa/surat"]
    : ["/kaprodi/surat", "/mahasiswa/surat"];
}

export async function submitLetter(
  _prev: LetterActionState,
  formData: FormData
): Promise<LetterActionState> {
  const user = await requireRole("mahasiswa");
  const letterType = readLetterType(formData.get("letterType"));
  const purpose = String(formData.get("purpose") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!letterType) return { error: "Jenis surat tidak valid." };
  if (!purpose) return { error: "Keperluan surat wajib diisi." };
  if (purpose.length > 1000) {
    return { error: "Keperluan maksimal 1000 karakter." };
  }

  await db.insert(letterRequests).values({
    userId: user.id,
    letterType,
    purpose,
    destination,
    notes,
  });
  redirect("/mahasiswa/surat");
}

export async function verifyLetter(
  _prev: LetterActionState,
  formData: FormData
): Promise<LetterActionState> {
  const user = await requireRole("admin");
  const letterId = String(formData.get("letterId") ?? "");
  if (!letterId) return { error: "ID pengajuan tidak ditemukan." };

  const [updated] = await db
    .update(letterRequests)
    .set({
      status: "pending_kaprodi",
      staffVerifiedById: user.id,
      verifiedAt: new Date(),
    })
    .where(
      and(
        eq(letterRequests.id, letterId),
        eq(letterRequests.status, "pending_staff")
      )
    )
    .returning({ id: letterRequests.id });

  if (!updated) {
    return { error: "Pengajuan tidak ditemukan atau bukan dalam antrian verifikasi." };
  }
  revalidatePath("/admin/surat");
  revalidatePath("/mahasiswa/surat");
  return { success: "Berkas diverifikasi dan diteruskan ke Kaprodi." };
}

/**
 * Buat PDF surat ber-QR lalu kembalikan URL dokumennya (PRD §3A & §4).
 *
 * - Penyimpanan objek dikonfigurasi → PDF diunggah sekali ke `surat/<tahun>/…`
 *   sehingga mahasiswa memakai URL publik permanen.
 * - Belum dikonfigurasi/gagal → jatuh ke route dinamis `/api/surat/<id>/pdf`
 *   yang membuat ulang PDF dari data surat saat diunduh.
 */
async function prepareLetterDocument(input: {
  letterId: string;
  letterType: LetterType;
  purpose: string;
  destination: string | null;
  documentNumber: string;
  qrToken: string;
  approvedAt: Date;
  requester: { name: string; nim: string | null };
  signer: { name: string; nidn: string | null };
}): Promise<string> {
  const fallbackUrl = `/api/surat/${input.letterId}/pdf`;

  try {
    const pdf = await buildLetterPdf({
      letterType: input.letterType,
      documentNumber: input.documentNumber,
      qrToken: input.qrToken,
      purpose: input.purpose,
      destination: input.destination,
      approvedAt: input.approvedAt,
      requester: input.requester,
      signer: input.signer,
      verificationUrl: await verificationUrl(input.qrToken),
    });

    if (isStorageConfigured()) {
      const uploaded = await uploadLetterPdf(
        pdf,
        letterPdfFileName(input.documentNumber)
      );
      if ("url" in uploaded) return uploaded.url;
      console.error("Gagal mengunggah PDF surat:", uploaded.error);
    }
  } catch (error) {
    console.error("Gagal membuat PDF surat:", error);
  }

  return fallbackUrl;
}

export async function approveLetter(
  _prev: LetterActionState,
  formData: FormData
): Promise<LetterActionState> {
  const user = await requireRole("kaprodi");
  const letterId = String(formData.get("letterId") ?? "");
  if (!letterId) return { error: "ID pengajuan tidak ditemukan." };

  const [existing] = await db
    .select({
      letterType: letterRequests.letterType,
      purpose: letterRequests.purpose,
      destination: letterRequests.destination,
      requesterName: users.name,
      requesterNim: users.nim,
    })
    .from(letterRequests)
    .innerJoin(users, eq(letterRequests.userId, users.id))
    .where(
      and(
        eq(letterRequests.id, letterId),
        eq(letterRequests.status, "pending_kaprodi")
      )
    )
    .limit(1);
  if (!existing) {
    return { error: "Surat tidak ditemukan atau bukan dalam antrian TTD." };
  }

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);
  const [{ value: yearCount }] = await db
    .select({ value: count() })
    .from(letterRequests)
    .where(
      and(
        eq(letterRequests.status, "approved"),
        gte(letterRequests.approvedAt, startOfYear),
        lt(letterRequests.approvedAt, startOfNextYear)
      )
    );

  const documentNumber = `TI/${now.getFullYear()}/${String(Number(yearCount) + 1).padStart(3, "0")}`;
  const qrToken = randomUUID().replaceAll("-", "").slice(0, 32);

  const [signer] = await db
    .select({ name: users.name, nidn: users.nidn })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const documentUrl = await prepareLetterDocument({
    letterId,
    letterType: existing.letterType,
    purpose: existing.purpose,
    destination: existing.destination,
    documentNumber,
    qrToken,
    approvedAt: now,
    requester: { name: existing.requesterName, nim: existing.requesterNim },
    signer: {
      name: signer?.name ?? user.name ?? "Ketua Program Studi",
      nidn: signer?.nidn ?? null,
    },
  });

  const [updated] = await db
    .update(letterRequests)
    .set({
      status: "approved",
      kaprodiApprovedById: user.id,
      approvedAt: now,
      documentNumber,
      qrToken,
      documentUrl,
    })
    .where(
      and(
        eq(letterRequests.id, letterId),
        eq(letterRequests.status, "pending_kaprodi")
      )
    )
    .returning({ id: letterRequests.id });

  if (!updated) return { error: "Surat sudah diproses pengguna lain." };
  revalidatePath("/kaprodi/surat");
  revalidatePath("/admin/surat");
  revalidatePath("/mahasiswa/surat");
  revalidatePath("/mahasiswa");
  return {
    success: `Surat disetujui. Nomor dokumen: ${documentNumber}. PDF ber-QR siap diunduh.`,
  };
}

export async function rejectLetter(
  _prev: LetterActionState,
  formData: FormData
): Promise<LetterActionState> {
  const user = await requireRole("admin", "kaprodi");
  const letterId = String(formData.get("letterId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!letterId) return { error: "ID pengajuan tidak ditemukan." };
  if (!reason) return { error: "Alasan penolakan wajib diisi." };
  if (reason.length > REJECT_REASON_MAX) {
    return { error: `Alasan maksimal ${REJECT_REASON_MAX} karakter.` };
  }

  const expectedStatus: LetterStatus =
    user.role === "admin" ? "pending_staff" : "pending_kaprodi";

  const [updated] = await db
    .update(letterRequests)
    .set({ status: "rejected", rejectionReason: reason })
    .where(
      and(
        eq(letterRequests.id, letterId),
        eq(letterRequests.status, expectedStatus)
      )
    )
    .returning({ id: letterRequests.id });

  if (!updated) {
    return { error: "Pengajuan tidak ditemukan atau status sudah berubah." };
  }
  for (const path of rejectPaths(user.role)) revalidatePath(path);
  return { success: "Pengajuan ditolak." };
}