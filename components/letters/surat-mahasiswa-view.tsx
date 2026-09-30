import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { letterRequests } from "@/db/schema";
import { LETTER_TYPE_LABELS } from "@/db/schema";
import { requireRole } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import {
  letterPdfHref,
  letterVerificationHref,
} from "@/lib/letters/links";
import {
  ButtonLink,
  Callout,
  EmptyState,
  PageHeader,
  SectionCard,
  StepList,
} from "@/components/ui";
import { LetterStatusBadge } from "./letter-status-badge";

const SURAT_STEPS = [
  { title: "Diajukan", description: "Formulir diterima sistem." },
  { title: "Verifikasi Staf", description: "Admin memeriksa berkas." },
  { title: "TTD Kaprodi", description: "Kaprodi menandatangani digital." },
  { title: "Selesai", description: "PDF ber-QR siap diunduh." },
];

export async function SuratMahasiswaView() {
  const user = await requireRole("mahasiswa");

  const letters = await db
    .select()
    .from(letterRequests)
    .where(eq(letterRequests.userId, user.id))
    .orderBy(desc(letterRequests.createdAt));

  const activeCount = letters.filter(
    (l) => l.status === "pending_staff" || l.status === "pending_kaprodi"
  ).length;
  const doneCount = letters.filter((l) => l.status === "approved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Surat Saya"
        description="Ajukan permohonan surat dan pantau status pemrosesan sampai selesai."
        action={
          <ButtonLink href="/mahasiswa/surat/baru" icon="plus">
            Ajukan Surat
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-700">Sedang diproses</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-700">Selesai</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{doneCount}</p>
        </div>
      </div>

      <SectionCard title="Alur Pemrosesan Surat">
        <StepList steps={SURAT_STEPS} />
      </SectionCard>

      <SectionCard
        title="Riwayat Pengajuan"
        description="Daftar surat yang pernah Anda ajukan."
        bodyClassName="px-0 py-0"
      >
        {letters.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              icon="file"
              title="Belum ada pengajuan surat"
              description="Ajukan surat keterangan aktif kuliah, pengantar penelitian, atau pengantar magang/KP."
            >
              <ButtonLink href="/mahasiswa/surat/baru" icon="plus">
                Ajukan Surat Pertama
              </ButtonLink>
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Jenis Surat</th>
                  <th className="px-5 py-3 font-medium">Diajukan</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Berkas</th>
                </tr>
              </thead>
              <tbody>
                {letters.map((letter) => (
                  <tr
                    key={letter.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">
                        {LETTER_TYPE_LABELS[letter.letterType]}
                      </p>
                      <p className="mt-0.5 max-w-xs text-xs text-slate-500">
                        {letter.purpose}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDateTime(letter.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <LetterStatusBadge status={letter.status} />
                      {letter.status === "rejected" && letter.rejectionReason && (
                        <p className="mt-1 max-w-[14rem] text-[11px] text-red-600">
                          Alasan: {letter.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {letter.status === "approved" ? (
                        <div className="space-y-1">
                          <a
                            href={letterPdfHref(letter)}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs font-semibold text-blue-600 hover:underline"
                          >
                            Unduh PDF
                          </a>
                          <p className="text-[11px] text-slate-400">
                            {letter.documentNumber ?? "Nomor diterbitkan"}
                          </p>
                          {letter.qrToken && (
                            <Link
                              href={letterVerificationHref(letter.qrToken)}
                              className="block text-xs font-medium text-slate-500 hover:text-blue-600 hover:underline"
                            >
                              Halaman validasi QR
                            </Link>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Callout tone="info">
        Surat yang telah ditandatangani Kaprodi otomatis diterbitkan sebagai PDF
        ber-QR Code. Unduh lewat kolom Berkas; QR pada dokumen mengarah ke
        halaman validasi publik untuk memeriksa keaslian surat.
      </Callout>
    </div>
  );
}