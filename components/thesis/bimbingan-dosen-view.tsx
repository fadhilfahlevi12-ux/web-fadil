import { requireRole } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { listBimbingan } from "@/lib/queries/bimbingan";
import {
  Badge,
  Callout,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { SeminarTypeBadge, SeminarWhenBadge } from "@/components/seminar/seminar-badge";
import { ThesisStatusBadge } from "./thesis-status-badge";

/**
 * Halaman Bimbingan untuk dosen (PRD §2 & §3B).
 * Menampilkan mahasiswa yang dibimbing (hasil penetapan Kaprodi) beserta
 * jadwal seminar mereka.
 */
export async function BimbinganDosenView() {
  const user = await requireRole("dosen");

  const rows = await listBimbingan(user.id);

  const asPembimbing1 = rows.filter((row) => row.asPembimbing1).length;
  const asPembimbing2 = rows.length - asPembimbing1;
  const upcomingSeminars = rows.reduce(
    (total, row) => total + row.seminars.filter((item) => item.upcoming).length,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bimbingan Mahasiswa"
        description="Mahasiswa yang Anda bimbing beserta jadwal seminar proposal, hasil, dan tutup."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total bimbingan"
          value={rows.length}
          hint="Ditetapkan Kaprodi"
          icon="graduation"
          tone="violet"
        />
        <StatCard
          label="Pembimbing 1"
          value={asPembimbing1}
          hint="Penanggung jawab utama"
          icon="users"
          tone="blue"
        />
        <StatCard
          label="Pembimbing 2"
          value={asPembimbing2}
          hint="Pendamping"
          icon="users"
          tone="green"
        />
        <StatCard
          label="Seminar mendatang"
          value={upcomingSeminars}
          hint="Mahasiswa bimbingan Anda"
          icon="calendar"
          tone="amber"
        />
      </div>

      {rows.length === 0 ? (
        <Card className="p-5 sm:p-6">
          <EmptyState
            icon="graduation"
            title="Belum ada mahasiswa bimbingan"
            description="Daftar ini terisi otomatis setelah Kaprodi menetapkan Anda sebagai Dosen Pembimbing 1 atau 2 pada menu Penetapan Pembimbing."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <Card key={row.thesisId} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900">
                      {row.studentName}
                    </h2>
                    <Badge tone={row.asPembimbing1 ? "blue" : "violet"}>
                      {row.asPembimbing1 ? "Pembimbing 1" : "Pembimbing 2"}
                    </Badge>
                    <ThesisStatusBadge status={row.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    NIM {row.studentNim ?? "—"} · ditetapkan{" "}
                    {row.assignedAt ? formatDateTime(row.assignedAt) : "—"}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm font-medium leading-snug text-slate-800">
                {row.title}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {row.summary}
              </p>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Jadwal Seminar
                </p>
                {row.seminars.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Belum ada jadwal seminar yang dipublikasikan staf prodi.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {row.seminars.map((seminar) => (
                      <li
                        key={seminar.id}
                        className="flex flex-wrap items-center gap-2 text-xs text-slate-600"
                      >
                        <SeminarTypeBadge type={seminar.seminarType} />
                        <span className="font-medium text-slate-700">
                          {formatDateTime(seminar.heldAt)}
                        </span>
                        <span className="text-slate-400">
                          {seminar.location ?? "Ruang belum ditentukan"}
                        </span>
                        <SeminarWhenBadge upcoming={seminar.upcoming} />
                        {seminar.notes && (
                          <span className="w-full text-slate-500">
                            {seminar.notes}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Callout tone="info">
        Penetapan pembimbing dilakukan Kaprodi pada menu Penetapan Pembimbing,
        sehingga mahasiswa bimbingan tampil di sini tanpa perlu persetujuan
        terpisah. Jadwal seminar di atas mengikuti publikasi staf administrasi.
      </Callout>
    </div>
  );
}
