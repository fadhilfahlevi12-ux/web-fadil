import { requireRole } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { listSeminars, type SeminarRow } from "@/lib/queries/seminars";
import {
  Badge,
  Callout,
  EmptyState,
  PageHeader,
  SectionCard,
} from "@/components/ui";
import { SeminarTypeBadge, SeminarWhenBadge } from "./seminar-badge";

/** Daftar jadwal seminar (komponen murni, dideklarasikan di luar render). */
function SeminarList({
  items,
  currentUserId,
}: {
  items: SeminarRow[];
  currentUserId: string;
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((row) => (
        <li
          key={row.id}
          className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0"
        >
          <div className="flex flex-wrap items-center gap-2">
            <SeminarTypeBadge type={row.seminarType} />
            <SeminarWhenBadge upcoming={row.upcoming} />
            {row.studentId === currentUserId && (
              <Badge tone="violet">Jadwal Saya</Badge>
            )}
          </div>
          <div className="grid gap-1 text-sm sm:grid-cols-2">
            <p className="text-slate-700">
              <span className="text-slate-500">Waktu: </span>
              {formatDateTime(row.heldAt)}
            </p>
            <p className="text-slate-700">
              <span className="text-slate-500">Ruang: </span>
              {row.location ?? "—"}
            </p>
            <p className="text-slate-700">
              <span className="text-slate-500">Mahasiswa: </span>
              {row.studentName
                ? `${row.studentName}${row.studentNim ? ` (${row.studentNim})` : ""}`
                : "—"}
            </p>
            <p className="text-slate-700">
              <span className="text-slate-500">Penguji: </span>
              {row.notes ?? "—"}
            </p>
          </div>
          {row.thesisTitle && (
            <p className="text-xs text-slate-500">Judul: {row.thesisTitle}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Halaman jadwal seminar untuk mahasiswa: jadwal mendatang + riwayat. */
export async function SeminarMahasiswaView() {
  const user = await requireRole("mahasiswa");

  const rows = await listSeminars();
  const upcoming = rows
    .filter((row) => row.upcoming)
    .sort((a, b) => a.heldAt.getTime() - b.heldAt.getTime());
  const past = rows.filter((row) => !row.upcoming);
  const myCount = rows.filter((row) => row.studentId === user.id).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal Seminar & Ujian"
        description="Pantau jadwal seminar proposal, hasil, dan ujian tutup yang diterbitkan staf prodi."
      />

      <Callout tone="info">
        Jadwal dipublikasikan oleh Staf Administrasi Prodi. Jadwal yang terkait
        dengan pengajuan skripsi Anda ditandai dengan label{" "}
        <strong>Jadwal Saya</strong>.
      </Callout>

      <SectionCard
        title="Jadwal Mendatang"
        description={`${upcoming.length} jadwal belum dilaksanakan.`}
      >
        {upcoming.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Belum ada jadwal mendatang"
            description="Jadwal yang diterbitkan staf prodi akan tampil di sini. Periksa kembali menjelang masa seminar."
          />
        ) : (
          <SeminarList items={upcoming} currentUserId={user.id} />
        )}
      </SectionCard>

      <SectionCard
        title="Riwayat Seminar"
        description={
          myCount > 0
            ? `${past.length} jadwal telah berlalu — ${myCount} di antaranya terkait pengajuan Anda.`
            : `${past.length} jadwal telah berlalu.`
        }
      >
        {past.length === 0 ? (
          <EmptyState
            icon="clock"
            title="Belum ada riwayat seminar"
            description="Jadwal yang sudah dilaksanakan akan tercatat di sini."
          />
        ) : (
          <SeminarList items={past} currentUserId={user.id} />
        )}
      </SectionCard>
    </div>
  );
}
