import Link from "next/link";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db";
import {
  ARCHIVE_CATEGORY_LABELS,
  archiveCategoryEnum,
  archiveDocuments,
  users,
  type ArchiveCategory,
} from "@/db/schema";
import { requireRole } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { ARCHIVE_MAX_BYTES, isStorageConfigured } from "@/lib/storage";
import {
  Badge,
  Callout,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  type BadgeTone,
} from "@/components/ui";
import { ICONS } from "@/components/icons";
import {
  DeleteArchiveForm,
  UploadArchiveForm,
} from "@/components/archive-forms";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

export type ArchiveSearchParams = {
  q?: string;
  kategori?: string;
  tahun?: string;
};

const CATEGORY_TONE: Record<ArchiveCategory, BadgeTone> = {
  sk_rektor: "blue",
  sk_mengajar: "violet",
  akreditasi: "green",
  mou: "amber",
};

function readCategoryFilter(value?: string): ArchiveCategory | null {
  const raw = (value ?? "").trim();
  if (raw && (archiveCategoryEnum.enumValues as readonly string[]).includes(raw)) {
    return raw as ArchiveCategory;
  }
  return null;
}

/** Halaman arsip digital untuk admin: unggah, cari, filter, dan hapus dokumen. */
export async function ArchiveAdminView({
  searchParams,
}: {
  searchParams: ArchiveSearchParams;
}) {
  await requireRole("admin");

  const q = (searchParams.q ?? "").trim();
  const categoryFilter = readCategoryFilter(searchParams.kategori);
  const yearFilter = (searchParams.tahun ?? "").trim();

  const conditions = [];
  if (q) {
    conditions.push(
      or(
        ilike(archiveDocuments.title, `%${q}%`),
        ilike(archiveDocuments.description, `%${q}%`)
      )
    );
  }
  if (categoryFilter) {
    conditions.push(eq(archiveDocuments.category, categoryFilter));
  }
  if (yearFilter) {
    conditions.push(eq(archiveDocuments.academicYear, yearFilter));
  }

  const documents = await db
    .select({
      id: archiveDocuments.id,
      category: archiveDocuments.category,
      title: archiveDocuments.title,
      description: archiveDocuments.description,
      fileUrl: archiveDocuments.fileUrl,
      academicYear: archiveDocuments.academicYear,
      createdAt: archiveDocuments.createdAt,
      uploaderName: users.name,
    })
    .from(archiveDocuments)
    .leftJoin(users, eq(archiveDocuments.uploadedById, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(archiveDocuments.createdAt));

  const byCategory = await db
    .select({ category: archiveDocuments.category, value: count() })
    .from(archiveDocuments)
    .groupBy(archiveDocuments.category);

  const categoryCount = new Map(
    byCategory.map((row) => [row.category, Number(row.value)])
  );
  const totalAll = byCategory.reduce(
    (sum, row) => sum + Number(row.value),
    0
  );

  const yearRows = await db
    .selectDistinct({ academicYear: archiveDocuments.academicYear })
    .from(archiveDocuments);
  const years = yearRows
    .map((row) => row.academicYear)
    .filter((year): year is string => Boolean(year))
    .sort()
    .reverse();

  const storageEnabled = isStorageConfigured();
  const filtered = q || categoryFilter || yearFilter;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Arsip Digital Prodi"
        description="Kelola dokumen resmi prodi sebagai bank data untuk kebutuhan akreditasi."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total dokumen"
          value={totalAll}
          hint="Seluruh arsip tersimpan"
          icon="archive"
          tone="blue"
        />
        {(Object.keys(ARCHIVE_CATEGORY_LABELS) as ArchiveCategory[])
          .slice(0, 3)
          .map((category, index) => (
            <StatCard
              key={category}
              label={ARCHIVE_CATEGORY_LABELS[category]}
              value={categoryCount.get(category) ?? 0}
              hint="Jumlah dokumen"
              icon="file"
              tone={(["violet", "green", "amber"] as const)[index]}
            />
          ))}
      </div>

      {!storageEnabled && (
        <Callout tone="info">
          Upload berkas belum aktif karena kredensial Supabase Storage belum
          diisi. Anda tetap dapat menyimpan dokumen dengan menempelkan tautan
          (Drive/OneDrive). Untuk mengaktifkan upload PDF langsung, isi{" "}
          <strong>SUPABASE_URL</strong>, <strong>SUPABASE_SERVICE_ROLE_KEY</strong>{" "}
          (dan opsional <strong>SUPABASE_STORAGE_BUCKET</strong>) pada{" "}
          <code>.env</code>.
        </Callout>
      )}

      <SectionCard
        title="Tambah Dokumen"
        description="Simpan dokumen resmi prodi beserta kategorisasi dan tahun akademik."
      >
        <UploadArchiveForm
          storageEnabled={storageEnabled}
          maxSizeMb={Math.round(ARCHIVE_MAX_BYTES / (1024 * 1024))}
        />
      </SectionCard>

      <SectionCard
        title="Daftar Dokumen"
        description={
          filtered
            ? `${documents.length} dokumen sesuai filter.`
            : `${documents.length} dokumen tersimpan.`
        }
        bodyClassName="px-0 py-0"
      >
        <form
          method="get"
          className="grid gap-3 border-b border-slate-100 px-5 py-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]"
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <ICONS.search className="h-4 w-4" />
            </span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Cari judul atau deskripsi dokumen…"
              aria-label="Cari dokumen"
              className={`${inputClass} pl-9`}
            />
          </div>

          <select
            name="kategori"
            defaultValue={categoryFilter ?? ""}
            aria-label="Filter kategori"
            className={inputClass}
          >
            <option value="">Semua kategori</option>
            {(Object.keys(ARCHIVE_CATEGORY_LABELS) as ArchiveCategory[]).map(
              (category) => (
                <option key={category} value={category}>
                  {ARCHIVE_CATEGORY_LABELS[category]}
                </option>
              )
            )}
          </select>

          <select
            name="tahun"
            defaultValue={yearFilter}
            aria-label="Filter tahun akademik"
            className={inputClass}
          >
            <option value="">Semua tahun</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Filter
            </button>
            {filtered && (
              <Link
                href="/admin/arsip"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </Link>
            )}
          </div>
        </form>

        {documents.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              icon="archive"
              title={filtered ? "Tidak ada dokumen cocok" : "Belum ada dokumen tersimpan"}
              description={
                filtered
                  ? "Ubah kata kunci atau filter kategori/tahun akademik, lalu klik Filter kembali."
                  : "SK Rektor, SK Mengajar, sertifikat akreditasi, dan MoU yang diunggah akan tersedia di sini beserta metadata tahun dan kategori."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Kategori</th>
                  <th className="px-5 py-3 font-medium">Dokumen</th>
                  <th className="px-5 py-3 font-medium">Tahun</th>
                  <th className="px-5 py-3 font-medium">Diunggah</th>
                  <th className="px-5 py-3 font-medium">Berkas</th>
                  <th className="px-5 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr
                    key={document.id}
                    className="border-b border-slate-100 align-top last:border-0"
                  >
                    <td className="px-5 py-4">
                      <Badge tone={CATEGORY_TONE[document.category]}>
                        {ARCHIVE_CATEGORY_LABELS[document.category]}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <p className="max-w-sm font-medium text-slate-900">
                        {document.title}
                      </p>
                      {document.description && (
                        <p className="mt-0.5 max-w-sm text-xs text-slate-500">
                          {document.description}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {document.academicYear ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <p className="text-xs">{document.uploaderName ?? "—"}</p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(document.createdAt)}
                      </p>
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
                    <td className="px-5 py-4">
                      <DeleteArchiveForm documentId={document.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
