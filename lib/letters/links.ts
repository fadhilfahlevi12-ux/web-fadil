import type { LetterRequest } from "@/db/schema";

/**
 * Tautan berkas PDF sebuah surat (PRD §3A).
 *
 * Bila PDF sudah diunggah ke penyimpanan objek, `documentUrl` berisi URL
 * publiknya. Jika penyimpanan belum dikonfigurasi, dokumen dibuat saat
 * diminta melalui route `/api/surat/[id]/pdf` (butuh login pemilik/staf).
 */
export function letterPdfHref(
  letter: Pick<LetterRequest, "id" | "documentUrl">
): string {
  return letter.documentUrl ?? `/api/surat/${letter.id}/pdf`;
}

/** Tautan halaman publik validasi keaslian surat (target QR Code). */
export function letterVerificationHref(qrToken: string): string {
  return `/validasi/${qrToken}`;
}
