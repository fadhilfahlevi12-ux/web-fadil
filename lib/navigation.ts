import type { Role } from "@/db/schema";

/**
 * Konfigurasi navigasi aplikasi per role (RBAC).
 * Satu-satunya sumber kebenaran untuk menu sidebar, halaman awal (home),
 * dan kartu akses cepat pada dasbor setiap role.
 */

export type NavIcon =
  | "home"
  | "file"
  | "graduation"
  | "calendar"
  | "archive"
  | "users"
  | "chart"
  | "inbox"
  | "bell"
  | "search"
  | "plus"
  | "download"
  | "check"
  | "clock"
  | "alert"
  | "chevron"
  | "arrow"
  | "menu"
  | "close";

export type RoleNavItem = {
  label: string;
  description: string;
  href: string;
  icon: NavIcon;
};

export type RoleNavGroup = {
  title: string;
  items: RoleNavItem[];
};

export const ROLE_META: Record<
  Role,
  { label: string; short: string; description: string }
> = {
  mahasiswa: {
    label: "Mahasiswa",
    short: "Mahasiswa",
    description:
      "Ajukan permohonan surat, pantau status proses, dan kelola administrasi skripsi Anda.",
  },
  admin: {
    label: "Staf Administrasi",
    short: "Admin",
    description:
      "Verifikasi berkas pengajuan, kelola arsip digital, jadwal akademik, dan akun pengguna.",
  },
  kaprodi: {
    label: "Ketua Program Studi",
    short: "Kaprodi",
    description:
      "Setujui pengajuan, berikan tanda tangan digital, dan pantau laporan prodi.",
  },
  dosen: {
    label: "Dosen",
    short: "Dosen",
    description:
      "Akses SK mengajar/surat tugas dan pantau mahasiswa bimbingan Anda.",
  },
};

export const ROLE_NAV: Record<Role, RoleNavGroup[]> = {
  mahasiswa: [
    {
      title: "Menu Mahasiswa",
      items: [
        {
          label: "Dasbor",
          href: "/mahasiswa",
          icon: "home",
          description: "Ringkasan pengajuan dan notifikasi Anda.",
        },
        {
          label: "Pengajuan Surat",
          href: "/mahasiswa/surat",
          icon: "file",
          description: "Ajukan surat dan pantau statusnya.",
        },
        {
          label: "Pengajuan Skripsi",
          href: "/mahasiswa/skripsi",
          icon: "graduation",
          description: "Usulan judul dan status penetapan pembimbing.",
        },
        {
          label: "Jadwal Seminar",
          href: "/mahasiswa/jadwal",
          icon: "calendar",
          description: "Lihat jadwal seminar proposal, hasil, dan tutup.",
        },
      ],
    },
  ],
  admin: [
    {
      title: "Ringkasan",
      items: [
        {
          label: "Dasbor",
          href: "/admin",
          icon: "home",
          description: "Pantau antrian dan ringkasan aktivitas administrasi.",
        },
      ],
    },
    {
      title: "Layanan",
      items: [
        {
          label: "Verifikasi Surat",
          href: "/admin/surat",
          icon: "file",
          description: "Periksa dan verifikasi berkas pengajuan surat.",
        },
        {
          label: "Jadwal Seminar",
          href: "/admin/jadwal",
          icon: "calendar",
          description: "Publikasikan jadwal seminar/ujian mahasiswa.",
        },
      ],
    },
    {
      title: "Administrasi Prodi",
      items: [
        {
          label: "Arsip Digital",
          href: "/admin/arsip",
          icon: "archive",
          description: "Kelola dokumen resmi untuk kebutuhan akreditasi.",
        },
        {
          label: "Data Akademik",
          href: "/admin/data-akademik",
          icon: "graduation",
          description:
            "Impor NAMA/NIM mahasiswa & NAMA/NIDN dosen sebagai acuan pendaftaran.",
        },
        {
          label: "Manajemen Pengguna",
          href: "/admin/users",
          icon: "users",
          description: "Buat akun dosen dan kaprodi.",
        },
        {
          label: "Laporan & Rekap",
          href: "/admin/laporan",
          icon: "chart",
          description: "Statistik dan ekspor rekap administrasi.",
        },
      ],
    },
  ],
  kaprodi: [
    {
      title: "Ringkasan",
      items: [
        {
          label: "Dasbor",
          href: "/kaprodi",
          icon: "home",
          description: "Ringkasan pengajuan yang menunggu keputusan Anda.",
        },
      ],
    },
    {
      title: "Persetujuan",
      items: [
        {
          label: "Persetujuan Surat & TTD",
          href: "/kaprodi/surat",
          icon: "file",
          description: "Setujui surat dan beri tanda tangan digital.",
        },
        {
          label: "Penetapan Pembimbing",
          href: "/kaprodi/skripsi",
          icon: "graduation",
          description: "Setujui judul dan tetapkan dosen pembimbing.",
        },
      ],
    },
    {
      title: "Monitoring",
      items: [
        {
          label: "Laporan Prodi",
          href: "/kaprodi/laporan",
          icon: "chart",
          description: "Pantau aktivitas akademik dan administrasi.",
        },
      ],
    },
  ],
  dosen: [
    {
      title: "Menu Dosen",
      items: [
        {
          label: "Dasbor",
          href: "/dosen",
          icon: "home",
          description: "Ringkasan dokumen dan bimbingan.",
        },
        {
          label: "Surat & SK",
          href: "/dosen/surat",
          icon: "file",
          description: "SK Mengajar & dokumen resmi prodi untuk dosen.",
        },
        {
          label: "Bimbingan",
          href: "/dosen/bimbingan",
          icon: "graduation",
          description: "Mahasiswa bimbingan beserta jadwal seminar.",
        },
      ],
    },
  ],
};

export function homePath(role: Role) {
  return `/${role}`;
}

/** Menu utama tanpa item home — dipakai untuk kartu akses cepat di dasbor. */
export function quickLinksFor(role: Role): RoleNavItem[] {
  const home = homePath(role);
  return ROLE_NAV[role]
    .flatMap((group) => group.items)
    .filter((item) => item.href !== home);
}
