import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { getLaporanStats, type LaporanData } from "@/lib/queries/stats";
import { formatDateTime } from "@/lib/format";
import {
  Callout,
  Card,
  DownloadButton,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/ui";
import { BreakdownChart, ColumnChart } from "@/components/charts";

export default async function LaporanModulePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const user = await requireUser();

  // Layout [role] sudah menjamin role sama; laporan hanya untuk admin & kaprodi.
  if (role !== user.role || (user.role !== "admin" && user.role !== "kaprodi")) {
    redirect(`/${user.role}`);
  }

  const data = await getLaporanStats({ id: user.id, role: user.role });

  return user.role === "admin" ? (
    <LaporanAdmin data={data} />
  ) : (
    <LaporanKaprodi data={data} />
  );
}

function UpdatedAt() {
  return (
    <p className="text-xs text-slate-400">
      Data diperbarui {formatDateTime(new Date())}
    </p>
  );
}


function LaporanAdmin({ data }: { data: LaporanData }) {
  const { stats, lettersByMonth, thesisByStatus } = data;
  const monthlyTotal = lettersByMonth.reduce((sum, p) => sum + p.value, 0);

  const rekapSurat = [
    {
      label: "Menunggu verifikasi staf",
      value: stats.letters_pending_staff ?? 0,
    },
    {
      label: "Menunggu TTD Kaprodi",
      value: stats.letters_pending_kaprodi ?? 0,
    },
    { label: "Surat selesai", value: stats.letters_approved ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan & Rekap Administrasi"
        description="Ringkasan pengajuan surat, skripsi, dan arsip prodi."
        action={
          <div className="flex flex-wrap gap-2">
            <DownloadButton
              href="/api/laporan/export?format=excel"
              variant="secondary"
            >
              Ekspor Excel
            </DownloadButton>
            <DownloadButton
              href="/api/laporan/export?format=pdf"
              variant="secondary"
            >
              Ekspor PDF
            </DownloadButton>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Callout tone="info">
          Seluruh angka pada halaman ini dihitung langsung dari basis data
          SIMAP, bukan data contoh. Berkas ekspor Excel/PDF memuat ringkasan
          yang sama ditambah rekap surat, usulan skripsi, arsip, dan jadwal
          seminar.
        </Callout>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pengajuan bulan ini"
          value={stats.letters_this_month ?? 0}
          hint="Surat dibuat bulan berjalan"
          icon="file"
          tone="blue"
        />
        <StatCard
          label="Surat selesai"
          value={stats.letters_approved ?? 0}
          hint="Sudah ber-TTD Kaprodi"
          icon="check"
          tone="green"
        />
        <StatCard
          label="Pengajuan skripsi"
          value={stats.thesis_total ?? 0}
          hint="Total usulan judul"
          icon="graduation"
          tone="violet"
        />
        <StatCard
          label="Dokumen arsip"
          value={stats.archive_total ?? 0}
          hint="Bank data prodi"
          icon="archive"
          tone="amber"
        />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Statistik Visual
            </h2>
            <p className="text-xs text-slate-500">
              Jumlah pengajuan surat per bulan &amp; sebaran status skripsi.
            </p>
          </div>
          <UpdatedAt />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pengajuan Surat per Bulan
            </h3>
            <ColumnChart
              data={lettersByMonth}
              tone="blue"
              summary={`Total ${monthlyTotal} pengajuan dalam ${lettersByMonth.length} bulan terakhir.`}
              emptyLabel="Belum ada pengajuan surat yang tercatat pada periode ini."
            />
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status Pengajuan Skripsi
            </h3>
            <BreakdownChart
              data={thesisByStatus}
              tones={["amber", "green", "red"]}
              emptyLabel="Belum ada usulan judul skripsi dari mahasiswa."
            />
          </div>
        </div>
      </Card>

      <SectionCard
        title="Rekap Administrasi Surat"
        description="Ringkasan antrian dan hasil pemrosesan surat."
      >
        <dl className="divide-y divide-slate-100">
          {rekapSurat.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <dt className="text-sm text-slate-600">{row.label}</dt>
              <dd className="text-lg font-bold text-slate-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
    </div>
  );
}


function LaporanKaprodi({ data }: { data: LaporanData }) {
  const { stats, lettersByMonth, thesisByStatus } = data;
  const monthlyTotal = lettersByMonth.reduce((sum, p) => sum + p.value, 0);
  const thesisTotal = thesisByStatus.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Monitoring Prodi"
        description="Pantau aktivitas akademik dan administrasi program studi."
        action={
          <div className="flex flex-wrap gap-2">
            <DownloadButton
              href="/api/laporan/export?format=excel"
              variant="secondary"
            >
              Ekspor Excel
            </DownloadButton>
            <DownloadButton
              href="/api/laporan/export?format=pdf"
              variant="secondary"
            >
              Ekspor PDF
            </DownloadButton>
          </div>
        }
      />

      <Callout tone="info">
        Ringkasan pengajuan yang memerlukan keputusan, tren aktivitas per
        periode, serta sebaran status skripsi mahasiswa bimbingan Anda. Tombol
        ekspor menghasilkan berkas Excel (multi-sheet) atau PDF berisi rekap
        lengkap prodi.
      </Callout>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Menunggu TTD"
          value={stats.letters_pending_kaprodi ?? 0}
          hint="Surat antrian tanda tangan"
          icon="file"
          tone="amber"
        />
        <StatCard
          label="Judul skripsi masuk"
          value={stats.thesis_pending ?? 0}
          hint="Belum diputuskan"
          icon="graduation"
          tone="blue"
        />
        <StatCard
          label="Surat selesai"
          value={stats.letters_approved ?? 0}
          hint="Sudah ditandatangani"
          icon="check"
          tone="green"
        />
        <StatCard
          label="Mahasiswa bimbingan"
          value={stats.thesis_supervised ?? 0}
          hint="Anda sebagai pembimbing"
          icon="users"
          tone="violet"
        />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Grafik Aktivitas Akademik
            </h2>
            <p className="text-xs text-slate-500">
              Pengajuan surat per bulan &amp; sebaran status skripsi.
            </p>
          </div>
          <UpdatedAt />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pengajuan Surat per Bulan
            </h3>
            <ColumnChart
              data={lettersByMonth}
              tone="blue"
              summary={`Total ${monthlyTotal} pengajuan dalam ${lettersByMonth.length} bulan terakhir.`}
              emptyLabel="Belum ada pengajuan surat yang tercatat pada periode ini."
            />
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status Skripsi Mahasiswa
            </h3>
            <BreakdownChart
              data={thesisByStatus}
              tones={["amber", "green", "red"]}
              emptyLabel="Belum ada usulan judul skripsi dari mahasiswa."
            />
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Total {thesisTotal} usulan judul tercatat pada sistem.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
