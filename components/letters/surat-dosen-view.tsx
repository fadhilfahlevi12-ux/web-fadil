import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { ARCHIVE_CATEGORY_LABELS, archiveDocuments } from "@/db/schema";
import { requireRole } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import {
  Callout,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/ui";

/**
 * Halaman Surat & SK untuk dosen (PRD §2).
 * Menampilkan SK Mengajar dan dokumen resmi prodi yang relevan bagi dosen,
 * bersumber dari bank data arsip digital prodi (diunggah staf administrasi).
 */
export async function SuratDosenView() {
  await requireRole("dosen");

  const documents = await db
    .select({
      id: archiveDocuments.id,
      title: archiveDocuments.title,
      description: archiveDocuments.description,
      academicYear: archiveDocuments.academicYear,
      fileUrl: archiveDocuments.fileUrl,
      createdAt: archiveDocuments.createdAt,
    })
    .from(archiveDocuments)
    .where(eq(archiveDocuments.category, "sk_mengajar"))
    .orderBy(desc(archiveDocuments.createdAt))
    .limit(20);

  const latest = documents[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Surat & SK Dosen"
        description="SK Mengajar dan dokumen resmi prodi yang berkaitan dengan dosen."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="SK Mengajar tersedia"
          value={documents.length}
          hint="Bank data arsip prodi"
          icon="file"
          tone="blue"
        />
        <StatCard
          label="Tahun akademik terakhir"
          value={latest?.academicYear ?? "—"}
          hint={latest ? latest.title : "Belum ada dokumen"}
          icon="calendar"
          tone="violet"
        />
        <StatCard
          label="Diunggah terakhir"
          value={latest ? formatDateTime(latest.createdAt) : "—"}
          hint="Oleh staf administrasi"
          icon="clock"
          tone="amber"
        />
      </div>

      <SectionCard
        title="SK Mengajar"
        description="Dokumen kategori SK Mengajar Dosen pada arsip digital prodi."
        bodyClassName="px-0 py-0"
      >
        {documents.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              icon="file"
              title="Belum ada SK Mengajar"
              description="Staf administrasi mengunggah SK Mengajar melalui menu Arsip Digital (kategori SK Mengajar Dosen). Dokumen yang diunggah akan tampil di sini beserta tahun akademiknya."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Dokumen</th>
                  <th className="px-5 py-3 font-medium">Tahun Akademik</th>
                  <th className="px-5 py-3 font-medium">Diunggah</th>
                  <th className="px-5 py-3 font-medium">Berkas</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr
                    key={document.id}
                    className="border-b border-slate-100 align-top last:border-0"
                  >
                    <td className="px-5 py-4">
                      <p className="max-w-md font-medium text-slate-900">
                        {document.title}
                      </p>
                      {document.description && (
                        <p className="mt-0.5 max-w-md text-xs text-slate-500">
                          {document.description}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {document.academicYear ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {formatDateTime(document.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Buka
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Callout tone="info">
        Daftar ini dibaca dari kategori{" "}
        <strong>{ARCHIVE_CATEGORY_LABELS.sk_mengajar}</strong> pada bank data
        arsip prodi. Surat tugas per dosen belum diterbitkan sistem, sehingga
        masih dikelola staf administrasi di luar modul ini.
      </Callout>
    </div>
  );
}
