import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  LETTER_STATUS_LABELS,
  LETTER_TYPE_LABELS,
  letterRequests,
  users,
} from "@/db/schema";
import { formatDateTime } from "@/lib/format";
import { Badge, Callout, Card, EmptyState, SectionCard } from "@/components/ui";

/**
 * Halaman publik validasi keaslian dokumen.
 * Target QR Code yang dicetak pada PDF surat: /validasi/<qrToken>.
 * Tidak memerlukan login — siapa pun yang memindai QR dapat memeriksa
 * apakah surat benar diterbitkan oleh Prodi Teknik Informatika UMPAR.
 */

// Selalu dirender saat diminta (baca database per permintaan).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Validasi Keaslian Dokumen — SIMAP TI UMPAR",
  description:
    "Halaman publik untuk memeriksa keaslian surat Prodi Teknik Informatika UMPAR melalui QR Code.",
};

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-full text-xs font-medium uppercase tracking-wide text-slate-500 sm:w-48">
        {label}
      </dt>
      <dd className="text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-black text-white shadow-sm">
            S
          </div>
          <div className="leading-tight">
            <p className="text-base font-bold text-slate-900">SIMAP TI UMPAR</p>
            <p className="text-xs text-slate-500">
              Sistem Informasi Manajemen Administrasi Prodi Teknik Informatika
            </p>
          </div>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-slate-400">
          Halaman ini diakses dengan memindai QR Code pada dokumen resmi prodi.
        </p>
      </div>
    </main>
  );
}

export default async function ValidasiDokumenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const qrToken = token.trim().slice(0, 64);

  const [record] = await db
    .select({ letter: letterRequests, requester: users })
    .from(letterRequests)
    .innerJoin(users, eq(letterRequests.userId, users.id))
    .where(eq(letterRequests.qrToken, qrToken))
    .limit(1);

  const isValid = record?.letter.status === "approved";

  if (!record || !isValid) {
    return (
      <PublicShell>
        <Card className="p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="red">Tidak Valid</Badge>
            <span className="text-xs text-slate-400">
              Kode: {qrToken || "—"}
            </span>
          </div>
          <EmptyState
            icon="alert"
            title="Dokumen tidak ditemukan"
            description="Kode validasi tidak terdaftar pada sistem, atau surat belum disetujui Kaprodi. Pastikan QR Code dipindai langsung dari dokumen asli SIMAP TI UMPAR."
          />
        </Card>
        <div className="mt-4">
          <Callout tone="warn">
            Jika Anda menerima dokumen dengan QR Code seperti ini, hubungi Staf
            Administrasi Prodi Teknik Informatika UMPAR untuk memastikan
            keabsahannya.
          </Callout>
        </div>
      </PublicShell>
    );
  }

  const { letter, requester } = record;

  let signerName = "Kaprodi";
  if (letter.kaprodiApprovedById) {
    const [signer] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, letter.kaprodiApprovedById))
      .limit(1);
    signerName = signer?.name ?? signerName;
  }

  return (
    <PublicShell>
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5 text-white">
          <h1 className="text-lg font-bold">Dokumen Terverifikasi</h1>
          <p className="mt-0.5 text-sm text-emerald-50">
            Surat ini sah diterbitkan oleh Prodi Teknik Informatika UMPAR.
          </p>
        </div>

        <dl className="px-6 py-4 sm:px-8">
          <DataRow
            label="Nomor Dokumen"
            value={letter.documentNumber ?? "Belum diberi nomor"}
          />
          <DataRow
            label="Jenis Surat"
            value={LETTER_TYPE_LABELS[letter.letterType]}
          />
          <DataRow
            label="Pemohon"
            value={`${requester.name}${requester.nim ? ` (${requester.nim})` : ""}`}
          />
          <DataRow label="Keperluan" value={letter.purpose} />
          <DataRow label="Instansi Tujuan" value={letter.destination ?? "—"} />
          <DataRow
            label="Tanggal Disetujui"
            value={formatDateTime(letter.approvedAt)}
          />
          <DataRow label="Ditandatangani Oleh" value={signerName} />
          <DataRow label="Status" value={LETTER_STATUS_LABELS[letter.status]} />
          <DataRow label="Kode Validasi" value={qrToken} />
        </dl>
      </Card>

      <div className="mt-4 space-y-4">
        <Callout tone="success">
          Data di atas berasal langsung dari basis data SIMAP dan bersifat
          read-only. Berkas PDF resmi surat ini memuat QR Code yang mengarah ke
          halaman ini, sehingga keasliannya dapat diperiksa kapan saja tanpa
          login.
        </Callout>

        <SectionCard
          title="Cara memeriksa keaslian surat"
          description="Langkah singkat bagi pihak eksternal yang menerima dokumen."
        >
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              • Pindai QR Code pada berkas PDF surat — halaman ini akan terbuka
              otomatis dan menampilkan data surat dari basis data SIMAP.
            </li>
            <li>
              • Cocokkan nomor dokumen, nama pemohon, dan keperluan pada PDF
              dengan data yang tampil di halaman ini.
            </li>
            <li>
              • Nomor dokumen dan kode validasi diterbitkan otomatis saat
              Kaprodi menyetujui pengajuan; satu kode hanya terhubung ke satu
              surat dan tidak dapat dipakai ulang.
            </li>
          </ul>
        </SectionCard>
      </div>
    </PublicShell>
  );
}

