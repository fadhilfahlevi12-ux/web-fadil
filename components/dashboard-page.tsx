import Link from "next/link";

import { ROLE_META, quickLinksFor } from "@/lib/navigation";
import type { NavIcon, RoleNavItem } from "@/lib/navigation";
import type { Role } from "@/db/schema";
import type { StatBundle, StatKey } from "@/lib/queries/stats";
import { formatDateTime } from "@/lib/format";
import { Badge, Card, ModuleCard, StatCard } from "@/components/ui";

type Tone = "blue" | "green" | "amber" | "red" | "violet";

/** Satu baris riwayat keputusan Kaprodi (sudah diformat di server). */
export type DecisionListItem = {
  id: string;
  kind: "letter" | "thesis";
  subject: string;
  title: string;
  outcome: "approved" | "rejected";
  note: string | null;
  atLabel: string;
};

type DashboardProps = {
  role: Role;
  name: string;
  email: string;
  stats: StatBundle;
  decisions?: DecisionListItem[];
};

type Stat = {
  key: StatKey;
  label: string;
  icon: NavIcon;
  tone: Tone;
  hint: string;
};

const ROLE_STATS: Record<Role, Stat[]> = {
  mahasiswa: [
    {
      key: "letters_in_process",
      label: "Surat dalam proses",
      icon: "clock",
      tone: "amber",
      hint: "Menunggu verifikasi / TTD",
    },
    {
      key: "letters_done",
      label: "Surat selesai",
      icon: "check",
      tone: "green",
      hint: "Siap diunduh (PDF ber-QR)",
    },
    {
      key: "thesis_total",
      label: "Pengajuan skripsi",
      icon: "graduation",
      tone: "blue",
      hint: "Usulan judul Anda",
    },
    {
      key: "notifications_recent",
      label: "Notifikasi baru",
      icon: "bell",
      tone: "violet",
      hint: "Perubahan status 30 hari terakhir",
    },
  ],
  admin: [
    {
      key: "letters_pending_staff",
      label: "Menunggu verifikasi",
      icon: "clock",
      tone: "amber",
      hint: "Antrian berkas Anda",
    },
    {
      key: "letters_pending_kaprodi",
      label: "Siap TTD Kaprodi",
      icon: "file",
      tone: "blue",
      hint: "Sudah diverifikasi staf",
    },
    {
      key: "archive_total",
      label: "Dokumen arsip",
      icon: "archive",
      tone: "violet",
      hint: "Bank data prodi",
    },
    {
      key: "users_total",
      label: "Pengguna terdaftar",
      icon: "users",
      tone: "green",
      hint: "Seluruh role",
    },
  ],
  kaprodi: [
    {
      key: "letters_pending_kaprodi",
      label: "Menunggu TTD Anda",
      icon: "clock",
      tone: "amber",
      hint: "Perlu keputusan",
    },
    {
      key: "thesis_pending",
      label: "Usulan judul masuk",
      icon: "graduation",
      tone: "blue",
      hint: "Belum diputuskan",
    },
    {
      key: "letters_approved",
      label: "Surat selesai",
      icon: "check",
      tone: "green",
      hint: "Sudah ditandatangani",
    },
    {
      key: "thesis_supervised",
      label: "Mahasiswa bimbingan",
      icon: "users",
      tone: "violet",
      hint: "Anda sebagai pembimbing",
    },
  ],
  dosen: [
    {
      key: "archive_sk_mengajar",
      label: "SK / surat aktif",
      icon: "file",
      tone: "blue",
      hint: "Arsip SK mengajar",
    },
    {
      key: "thesis_supervised",
      label: "Mahasiswa bimbingan",
      icon: "graduation",
      tone: "violet",
      hint: "Ditetapkan Kaprodi",
    },
    {
      key: "seminars_upcoming",
      label: "Seminar mendatang",
      icon: "calendar",
      tone: "amber",
      hint: "Jadwal terpublikasi",
    },
  ],
};

const NEXT_STEPS: Record<Role, string[]> = {
  mahasiswa: [
    "Catatan/log bimbingan bersama dosen pembimbing (modul baru).",
    "Pratinjau PDF surat sebelum diunduh.",
    "Unggah berkas pendukung pada formulir pengajuan surat.",
  ],
  admin: [
    "Verifikasi pengajuan beberapa berkas sekaligus (aksi massal).",
    "Template & penomoran surat yang dapat dikustomisasi prodi.",
    "Notifikasi surel untuk pengajuan baru di luar aplikasi.",
  ],
  kaprodi: [
    "Log bimbingan dosen–mahasiswa (modul baru).",
    "Tanda tangan dengan sertifikat digital (mis. BSrE) bila diperlukan.",
    "Penetapan penguji seminar langsung dari modul skripsi.",
  ],
  dosen: [
    "Surat tugas per dosen (belum terhubung ke akun, masih arsip prodi).",
    "Catatan bimbingan yang dapat disimpan per mahasiswa.",
    "Persetujuan bimbingan resmi dari dosen (saat ini otomatis saat Kaprodi menetapkan).",
  ],
};


function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

export function RoleDashboard({
  role,
  name,
  email,
  stats,
  decisions = [],
}: DashboardProps) {
  const meta = ROLE_META[role];
  const links = quickLinksFor(role);
  const firstName = name.trim().split(/\s+/)[0] ?? "Pengguna";
  const cardTones: Tone[] = ["blue", "green", "violet", "amber"];
  const statDefs = ROLE_STATS[role];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden border-0">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-100">
                {getGreeting()} 👋
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {firstName}, selamat datang di SIMAP
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100">
                {meta.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="blue">{meta.label}</Badge>
                <Badge tone="blue">{email}</Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Statistik langsung dari basis data (PRD §3D) */}
      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            Ringkasan {meta.short}
          </h2>
          <p className="text-xs text-slate-400">
            Diperbarui {formatDateTime(new Date())}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statDefs.map((stat) => (
            <StatCard
              key={stat.key}
              label={stat.label}
              value={stats[stat.key] ?? 0}
              hint={stat.hint}
              icon={stat.icon}
              tone={stat.tone}
            />
          ))}
        </div>
      </div>

      {/* Riwayat keputusan Kaprodi (PRD §3B) */}
      {role === "kaprodi" && (
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Riwayat Keputusan
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Surat dan usulan judul terakhir yang Anda putuskan.
              </p>
            </div>
            <Link
              href="/kaprodi/laporan"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Lihat laporan prodi
            </Link>
          </div>

          {decisions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
              Belum ada keputusan tercatat.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {decisions.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={item.outcome === "approved" ? "green" : "red"}
                      >
                        {item.outcome === "approved" ? "Disetujui" : "Ditolak"}
                      </Badge>
                      <Badge tone="neutral">
                        {item.kind === "letter" ? "Surat" : "Skripsi"}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-slate-800">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.subject}
                      {item.note ? ` — ${item.note}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">{item.atLabel}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Akses cepat modul */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-900">
            Modul {meta.short}
          </h2>
          <p className="text-sm text-slate-500">
            Pilih menu untuk membuka kerangka halaman modul.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item: RoleNavItem, i) => (
            <ModuleCard
              key={item.href}
              item={item}
              tone={cardTones[i % cardTones.length]}
            />
          ))}
        </div>
      </div>

      {/* Rencana langkah berikutnya */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
            <span className="text-base">→</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">
              Langkah berikutnya untuk modul {meta.short}
            </h2>
            <ul className="mt-3 space-y-2">
              {NEXT_STEPS[role].map((step) => (
                <li
                  key={step}
                  className="flex gap-2 text-sm leading-relaxed text-slate-600"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
