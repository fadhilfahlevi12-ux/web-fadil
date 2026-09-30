import { requireRole } from "@/lib/dal";
import { formatDateTime, toDateTimeLocalValue } from "@/lib/format";
import {
  listApprovedThesisOptions,
  listSeminars,
} from "@/lib/queries/seminars";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/ui";
import { PublishSeminarForm } from "@/components/seminar-forms";
import { SeminarTable, type SeminarTableRow } from "./seminar-table";

/** Halaman jadwal seminar untuk admin: publikasi & pengelolaan jadwal. */
export async function SeminarAdminView() {
  await requireRole("admin");

  const [rows, thesisOptions] = await Promise.all([
    listSeminars(),
    listApprovedThesisOptions(),
  ]);

  const tableRows: SeminarTableRow[] = rows.map((row) => ({
    id: row.id,
    seminarType: row.seminarType,
    heldAtLabel: formatDateTime(row.heldAt),
    heldAtValue: toDateTimeLocalValue(row.heldAt),
    studentName: row.studentName,
    studentNim: row.studentNim,
    thesisTitle: row.thesisTitle,
    location: row.location,
    notes: row.notes,
    upcoming: row.upcoming,
    thesisSubmissionId: row.thesisSubmissionId,
  }));

  const upcomingCount = rows.filter((row) => row.upcoming).length;
  const proposalCount = rows.filter(
    (row) => row.seminarType === "proposal"
  ).length;
  const finalCount = rows.filter((row) => row.seminarType !== "proposal").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Jadwal Seminar & Ujian"
        description="Publikasikan jadwal Seminar Proposal, Hasil, dan Tutup untuk mahasiswa."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total jadwal"
          value={rows.length}
          hint="Seluruh jadwal terpublikasi"
          icon="calendar"
          tone="blue"
        />
        <StatCard
          label="Jadwal mendatang"
          value={upcomingCount}
          hint="Belum dilaksanakan"
          icon="clock"
          tone="amber"
        />
        <StatCard
          label="Seminar proposal"
          value={proposalCount}
          hint="Tahap awal"
          icon="file"
          tone="violet"
        />
        <StatCard
          label="Seminar hasil & tutup"
          value={finalCount}
          hint="Tahap lanjutan"
          icon="check"
          tone="green"
        />
      </div>

      <SectionCard
        title="Buat Jadwal Baru"
        description="Jadwal akan langsung terlihat oleh mahasiswa setelah dipublikasikan."
      >
        <PublishSeminarForm thesisOptions={thesisOptions} />
      </SectionCard>

      <SectionCard
        title="Jadwal Terpublikasi"
        description="Ubah langsung pada baris jadwal bila ada perubahan waktu, ruang, atau dosen penguji."
        bodyClassName="px-0 py-0"
      >
        {rows.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              icon="calendar"
              title="Belum ada jadwal"
              description="Gunakan formulir di atas untuk mempublikasikan jadwal Seminar Proposal, Hasil, atau Tutup."
            />
          </div>
        ) : (
          <SeminarTable rows={tableRows} thesisOptions={thesisOptions} />
        )}
      </SectionCard>
    </div>
  );
}
