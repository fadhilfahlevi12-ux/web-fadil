import Link from "next/link";
import { and, count, desc, eq, ilike, isNotNull, or } from "drizzle-orm";

import { db } from "@/db";
import {
  MEMBER_IDENTIFIER_LABELS,
  MEMBER_TYPE_LABELS,
  campusMembers,
  memberTypeEnum,
  type MemberType,
} from "@/db/schema";
import { requireRole } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import {
  Badge,
  Callout,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  type BadgeTone,
} from "@/components/ui";
import {
  AddMemberForm,
  BulkImportMembersForm,
  DeleteMemberForm,
} from "@/components/member-forms";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

export type MemberSearchParams = {
  q?: string;
  jenis?: string;
};

const TYPE_TONE: Record<MemberType, BadgeTone> = {
  mahasiswa: "blue",
  dosen: "violet",
};

function readTypeFilter(value?: string): MemberType | null {
  const raw = (value ?? "").trim();
  if (raw && (memberTypeEnum.enumValues as readonly string[]).includes(raw)) {
    return raw as MemberType;
  }
  return null;
}

/**
 * Halaman Data Akademik untuk admin.
 * Menjadi acuan validasi: hanya NAMA/NIM (mahasiswa) dan NAMA/NIDN (dosen)
 * yang terdaftar di sini yang dapat memperoleh akun.
 */
export async function MemberAdminView({
  searchParams,
}: {
  searchParams: MemberSearchParams;
}) {
  await requireRole("admin");

  const q = (searchParams.q ?? "").trim();
  const typeFilter = readTypeFilter(searchParams.jenis);

  const conditions = [];
  if (q) {
    conditions.push(
      or(
        ilike(campusMembers.name, `%${q}%`),
        ilike(campusMembers.identifier, `%${q}%`)
      )
    );
  }
  if (typeFilter) {
    conditions.push(eq(campusMembers.memberType, typeFilter));
  }

  const rows = await db
    .select({
      id: campusMembers.id,
      memberType: campusMembers.memberType,
      name: campusMembers.name,
      identifier: campusMembers.identifier,
      claimedAt: campusMembers.claimedAt,
      createdAt: campusMembers.createdAt,
    })
    .from(campusMembers)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(campusMembers.createdAt))
    .limit(500);

  const byType = await db
    .select({ memberType: campusMembers.memberType, value: count() })
    .from(campusMembers)
    .groupBy(campusMembers.memberType);

  const typeCount = new Map(
    byType.map((row) => [row.memberType, Number(row.value)])
  );
  const totalMahasiswa = typeCount.get("mahasiswa") ?? 0;
  const totalDosen = typeCount.get("dosen") ?? 0;
  const totalAll = totalMahasiswa + totalDosen;

  const [claimedRow] = await db
    .select({ value: count() })
    .from(campusMembers)
    .where(isNotNull(campusMembers.claimedAt));
  const claimedTotal = Number(claimedRow?.value ?? 0);

  const filtered = Boolean(q || typeFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Akademik"
        description="Daftar resmi mahasiswa (NAMA/NIM) dan dosen (NAMA/NIDN) Prodi Teknik Informatika. Hanya data di sini yang dapat mendaftar atau dibuatkan akun."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Data"
          value={totalAll}
          hint="Mahasiswa + dosen"
          icon="users"
          tone="blue"
        />
        <StatCard
          label="Mahasiswa"
          value={totalMahasiswa}
          hint="Berbasis NIM"
          icon="graduation"
          tone="green"
        />
        <StatCard
          label="Dosen"
          value={totalDosen}
          hint="Berbasis NIDN"
          icon="users"
          tone="violet"
        />
        <StatCard
          label="Sudah Punya Akun"
          value={claimedTotal}
          hint={`Belum: ${totalAll - claimedTotal}`}
          icon="check"
          tone="amber"
        />
      </div>

      <Callout tone="info">
        Impor <strong>data dosen terlebih dahulu</strong> sebelum membuat akun
        Dosen/Kaprodi di menu Manajemen Pengguna, karena NIDN akan dicocokkan
        dengan daftar ini. Mahasiswa mendaftar sendiri di halaman{" "}
        <code>/register</code> menggunakan nama dan NIM yang terdaftar.
      </Callout>

      <SectionCard
        title="Tambah Satu Data"
        description="Masukkan satu orang secara manual."
      >
        <AddMemberForm />
      </SectionCard>

      <SectionCard
        title="Impor Massal"
        description="Tempel banyak baris sekaligus — satu baris satu orang."
      >
        <BulkImportMembersForm />
      </SectionCard>

      <SectionCard
        title="Daftar Data Akademik"
        description="Data yang sudah dipakai membuat akun tidak dapat dihapus."
        bodyClassName="px-0 py-0"
      >
        <form className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="q"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Cari nama atau NIM/NIDN
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Contoh: Ahmad atau 2201010001"
              className={inputClass}
            />
          </div>

          <div className="sm:w-44">
            <label
              htmlFor="jenis"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Jenis
            </label>
            <select
              id="jenis"
              name="jenis"
              defaultValue={typeFilter ?? ""}
              className={inputClass}
            >
              <option value="">Semua</option>
              {(Object.keys(MEMBER_TYPE_LABELS) as MemberType[]).map((type) => (
                <option key={type} value={type}>
                  {MEMBER_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Filter
            </button>
            {filtered && (
              <Link
                href="/admin/data-akademik"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </Link>
            )}
          </div>
        </form>

        {rows.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              icon="users"
              title={
                filtered
                  ? "Tidak ada data yang cocok"
                  : "Belum ada data akademik"
              }
              description={
                filtered
                  ? "Ubah kata kunci atau jenis data, lalu klik Filter kembali."
                  : "Impor NAMA/NIM mahasiswa dan NAMA/NIDN dosen melalui formulir di atas agar pendaftaran akun bisa divalidasi."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Jenis</th>
                  <th className="px-5 py-3 font-medium">Nama</th>
                  <th className="px-5 py-3 font-medium">NIM / NIDN</th>
                  <th className="px-5 py-3 font-medium">Status Akun</th>
                  <th className="px-5 py-3 font-medium">Ditambahkan</th>
                  <th className="px-5 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-5 py-4">
                      <Badge tone={TYPE_TONE[row.memberType]}>
                        {MEMBER_TYPE_LABELS[row.memberType]}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {row.name}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">
                      {MEMBER_IDENTIFIER_LABELS[row.memberType]}:{" "}
                      {row.identifier}
                    </td>
                    <td className="px-5 py-4">
                      {row.claimedAt ? (
                        <div>
                          <Badge tone="green">Sudah punya akun</Badge>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDateTime(row.claimedAt)}
                          </p>
                        </div>
                      ) : (
                        <Badge tone="amber">Belum punya akun</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <DeleteMemberForm
                        memberId={row.id}
                        claimed={Boolean(row.claimedAt)}
                      />
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
