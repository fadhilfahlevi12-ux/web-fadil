import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { letterRequests, users } from "@/db/schema";
import { verificationUrl } from "@/lib/app-url";
import { buildLetterPdf, letterPdfFileName } from "@/lib/pdf/letter-document";

/**
 * Unduhan PDF surat ber-QR (PRD §3A & §4).
 *
 * Dipakai saat `letter_requests.document_url` masih menunjuk ke route ini,
 * yaitu ketika penyimpanan objek (Supabase Storage) belum dikonfigurasi:
 * PDF dibangun ulang dari data surat setiap kali diunduh.
 *
 * Hak akses: pemilik surat, staf administrasi, dan Kaprodi.
 */

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonError(400, "ID surat tidak valid.");

  const session = await auth();
  const sessionUser = session?.user;
  if (!sessionUser) {
    return jsonError(401, "Silakan masuk untuk mengunduh dokumen surat.");
  }

  const [row] = await db
    .select({
      letter: letterRequests,
      requesterName: users.name,
      requesterNim: users.nim,
    })
    .from(letterRequests)
    .innerJoin(users, eq(letterRequests.userId, users.id))
    .where(eq(letterRequests.id, id))
    .limit(1);

  if (!row) return jsonError(404, "Surat tidak ditemukan.");

  const { letter } = row;
  const isOwner = letter.userId === sessionUser.id;
  const isStaff =
    sessionUser.role === "admin" || sessionUser.role === "kaprodi";
  if (!isOwner && !isStaff) {
    return jsonError(403, "Anda tidak berhak mengunduh surat ini.");
  }

  if (letter.status !== "approved" || !letter.documentNumber || !letter.qrToken) {
    return jsonError(
      409,
      "PDF surat hanya tersedia setelah disetujui Kaprodi."
    );
  }

  let signer: { name: string; nidn: string | null } = {
    name: "Ketua Program Studi Teknik Informatika",
    nidn: null,
  };
  if (letter.kaprodiApprovedById) {
    const [approver] = await db
      .select({ name: users.name, nidn: users.nidn })
      .from(users)
      .where(eq(users.id, letter.kaprodiApprovedById))
      .limit(1);
    if (approver) signer = approver;
  }

  const pdf = await buildLetterPdf({
    letterType: letter.letterType,
    documentNumber: letter.documentNumber,
    qrToken: letter.qrToken,
    purpose: letter.purpose,
    destination: letter.destination,
    approvedAt: letter.approvedAt,
    requester: { name: row.requesterName, nim: row.requesterNim },
    signer,
    verificationUrl: await verificationUrl(letter.qrToken),
  });

  const download = new URL(request.url).searchParams.has("download");
  const fileName = letterPdfFileName(letter.documentNumber);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
