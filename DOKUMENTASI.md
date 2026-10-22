# 📘 Dokumentasi Project — SIMAP TI UMPAR

> **SIMAP** = **Sistem Informasi Manajemen Administrasi Prodi** Teknik Informatika,
> Universitas Muhammadiyah Parepare (UMPAR).
>
> Dokumen ini menjelaskan isi project secara menyeluruh: fitur, struktur kode,
> skema database, alur bisnis, cara menjalankan, hingga catatan penting.
> Terakhir diperbarui: 2 Oktober 2026.

---

## Daftar Isi

1. [Ringkasan Project](#1-ringkasan-project)
2. [Tech Stack](#2-tech-stack)
3. [Struktur Folder](#3-struktur-folder)
4. [Peran Pengguna (Role) & Hak Akses](#4-peran-pengguna-role--hak-akses)
5. [Fitur / Modul](#5-fitur--modul)
6. [Skema Database](#6-skema-database)
7. [Alur Bisnis End-to-End](#7-alur-bisnis-end-to-end)
8. [Halaman & Route](#8-halaman--route)
9. [Server Actions (Logika Backend)](#9-server-actions-logika-backend)
10. [Lapisan Query & Laporan](#10-lapisan-query--laporan)
11. [PDF Surat & Validasi QR](#11-pdf-surat--validasi-qr)
12. [Penyimpanan Berkas (Supabase Storage)](#12-penyimpanan-berkas-supabase-storage)
13. [Autentikasi & Keamanan](#13-autentikasi--keamanan)
14. [Variabel Lingkungan (.env)](#14-variabel-lingkungan-env)
15. [Cara Menjalankan](#15-cara-menjalankan)
16. [Akun Contoh (Seed)](#16-akun-contoh-seed)
17. [Skrip Pemeriksa](#17-skrip-pemeriksa)
18. [Catatan & Konvensi Penting](#18-catatan--konvensi-penting)
19. [Status Modul (per PRD)](#19-status-modul-per-prd)

---

## 1. Ringkasan Project

SIMAP adalah aplikasi web (full-stack) untuk mendigitalkan administrasi Program
Studi Teknik Informatika UMPAR. Sebelumnya proses administrasi dilakukan
semi-manual sehingga rawan kehilangan dokumen, lambatnya persetujuan, dan sulit
dilacak.

**Masalah yang diselesaikan:**

- Pengajuan surat mahasiswa yang lambat & sulit dilacak.
- Arsip dokumen prodi (untuk akreditasi) yang tersebar.
- Monitoring kegiatan akademik & administrasi prodi.

**Solusi:**

- Layanan surat elektronik (pengajuan → verifikasi → tanda tangan digital → PDF ber-QR).
- Administrasi tugas akhir/skripsi (usulan judul, penetapan pembimbing, jadwal seminar).
- Arsip digital prodi untuk kebutuhan akreditasi.
- Dasbor & pelaporan (statistik + ekspor Excel/PDF).

Dokumen kebutuhan produk lengkap ada di [`PRD.MD`](./PRD.MD).

---

## 2. Tech Stack

| Lapisan | Teknologi | Versi (package.json) |
| --- | --- | --- |
| Framework | Next.js (App Router, TypeScript) | `16.3.4` |
| UI | React | `19.2.8` |
| Styling | Tailwind CSS | `^4` |
| Database | Supabase (PostgreSQL) | `postgres` driver `^3.4.9` |
| ORM | Drizzle ORM + Drizzle Kit | `drizzle-orm ^0.45.2` / `drizzle-kit ^0.31.10` |
| Autentikasi | NextAuth.js (Auth.js) + bcrypt | `next-auth ^5.0.0-beta.32`, `bcryptjs ^3.0.3` |
| PDF surat/laporan | `pdf-lib` | `^1.17.1` |
| QR Code | `qrcode` | `^1.5.4` |
| Excel laporan | `exceljs` | `^4.4.0` |
| Skrip TS | `tsx` | `^4.23.13` |

Jalur import memakai alias `@/*` → root project (lihat `tsconfig.json`).

---

## 3. Struktur Folder

```
web-fadil/
├── app/                      # Next.js App Router (halaman + route API)
│   ├── (app)/                # Grup route yang WAJIB login
│   │   ├── layout.tsx        # AppShell: sidebar, header, lonceng notifikasi
│   │   └── [role]/           # Segmen dinamis per role (mahasiswa/admin/kaprodi/dosen)
│   │       ├── layout.tsx    # Pengaman role (redirect bila lintas role)
│   │       ├── page.tsx      # Dasbor role
│   │       ├── surat/        # Pengajuan & daftar surat
│   │       ├── skripsi/      # Usulan judul & penetapan pembimbing
│   │       ├── jadwal/       # Jadwal seminar
│   │       ├── bimbingan/    # Bimbingan (dosen)
│   │       ├── arsip/        # Arsip digital (admin)
│   │       ├── data-akademik/ # Master data NAMA/NIM & NAMA/NIDN (admin)
│   │       ├── users/        # Manajemen pengguna (admin)
│   │       └── laporan/      # Laporan & rekap
│   ├── api/                  # Route handlers (PDF surat, ekspor laporan, auth)
│   ├── login/                # Halaman login
│   ├── register/             # Pendaftaran mandiri (mahasiswa)
│   ├── validasi/[token]/     # Halaman publik validasi keaslian surat (QR)
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Redirect ke /<role> atau /login
├── components/               # Komponen UI (server & client)
├── db/                       # Koneksi DB (index.ts) + skema (schema.ts)
├── drizzle/                  # File migrasi SQL + snapshot
├── lib/
│   ├── actions/              # Server Actions (mutasi data)
│   ├── queries/              # Query baca (server-only)
│   ├── reports/              # Generator laporan (Excel & PDF)
│   ├── pdf/                  # Generator PDF surat
│   ├── letters/              # Helper tautan surat
│   ├── storage.ts            # Helper Supabase Storage
│   ├── dal.ts                # Data Access Layer (sesi & RBAC)
│   ├── members.ts            # Normalisasi NIM/NIDN + parser impor NAMA/NIM/NIDN
│   ├── members-db.ts         # Upsert & sinkronisasi data akademik (dipakai action + skrip)
│   ├── navigation.ts         # Konfigurasi menu per role
│   ├── format.ts             # Format tanggal/waktu
│   └── app-url.ts            # Basis URL untuk QR Code
├── scripts/                  # Skrip seed, impor & pemeriksa (tsx)
├── data/                     # Sumber impor data akademik (file .txt diabaikan git)
├── types/next-auth.d.ts      # Augmentasi tipe NextAuth (id & role di sesi)
├── auth.ts                   # Konfigurasi NextAuth
├── proxy.ts                  # Middleware proteksi route (matcher per role)
├── drizzle.config.ts         # Konfigurasi Drizzle Kit
├── next.config.ts            # Konfigurasi Next (batas ukuran upload 10 MB)
├── PRD.MD                    # Product Requirements Document
├── README.md                 # Panduan singkat
└── DOKUMENTASI.md            # ← dokumen ini
```

---

## 4. Peran Pengguna (Role) & Hak Akses

Sistem memakai **RBAC (Role-Based Access Control)** dengan 4 role:

| Role | Label | Deskripsi | Cara dibuat |
| --- | --- | --- | --- |
| `mahasiswa` | Mahasiswa | Ajukan surat, usulkan judul skripsi, pantau jadwal seminar | **Self-register** di `/register` — cukup NIM + email (NIM wajib ada di **Data Akademik**; nama diambil otomatis) |
| `admin` | Staf Administrasi | Verifikasi berkas surat, kelola arsip, jadwal, akun, laporan | **Seed script** (bootstrap pengembang) |
| `kaprodi` | Ketua Program Studi | Setujui surat + TTD digital, setujui judul & tetapkan pembimbing | Dibuat **admin** via Manajemen Pengguna — NIDN wajib ada di **Data Akademik** |
| `dosen` | Dosen | Lihat SK/dokumen, pantau mahasiswa bimbingan & jadwal seminar | Dibuat **admin** via Manajemen Pengguna — NIDN wajib ada di **Data Akademik** |

**Aturan akses:**

- `proxy.ts` (middleware) melindungi URL `/mahasiswa/*`, `/admin/*`,
  `/kaprodi/*`, `/dosen/*` — wajib login.
- `app/(app)/[role]/layout.tsx` memaksa agar `/<role>/...` hanya bisa dibuka
  oleh pemilik role tersebut. Mahasiswa yang mencoba `/kaprodi` → diarahkan
  kembali ke `/mahasiswa`.
- Server Actions memakai `requireRole(...)` sebagai pengaman tambahan di
  sisi server (tidak cukup hanya menyembunyikan UI).
- Pendaftaran mandiri **hanya** untuk mahasiswa; role lain sengaja ditolak.
- **Whitelist akun**: setiap akun mahasiswa/dosen harus cocok dengan tabel
  `campus_members` (diisi admin lewat menu **Data Akademik**). NIM/NIDN hanya
  bisa dipakai **satu kali** untuk membuat akun.

---

## 5. Fitur / Modul

### A. Modul Layanan Surat Mahasiswa (E-Service)

- **Pengajuan surat** oleh mahasiswa. 3 jenis surat:
  - `active_student` → Surat Keterangan Aktif Kuliah
  - `research_introduction` → Surat Pengantar Penelitian
  - `internship_introduction` → Surat Pengantar Magang / KP
- **Tracking status**: `Menunggu Verifikasi Staf` → `Menunggu TTD Kaprodi` →
  `Selesai` (atau `Ditolak`).
- **Tanda tangan digital** oleh Kaprodi (disimulasikan di PDF).
- **Nomor dokumen otomatis**: format `TI/<tahun>/<urut 3 digit>`
  (contoh `TI/2026/001`).
- **Token QR** otomatis (32 karakter) untuk validasi keaslian.
- **Unduh PDF ber-QR** oleh mahasiswa.

### B. Modul Administrasi Tugas Akhir / Skripsi

- **Usulan judul** + ringkasan oleh mahasiswa (satu usulan aktif per mahasiswa).
- **Keputusan Kaprodi**: setujui / tolak (dengan alasan).
- **Penetapan Dosen Pembimbing 1 & 2** oleh Kaprodi (hanya untuk judul disetujui).
- **Jadwal Seminar** (Proposal / Hasil / Tutup/Ujian) dipublikasikan admin,
  bisa **disunting** dan **dibatalkan** tanpa hapus–publikasi ulang.
- **Halaman Bimbingan Dosen**: daftar mahasiswa bimbingan + jadwal seminarnya.

### C. Modul Arsip Digital Prodi (E-Archive)

- Simpan dokumen resmi dengan kategori:
  - `sk_rektor` → SK Rektor
  - `sk_mengajar` → SK Mengajar Dosen
  - `akreditasi` → Sertifikat Akreditasi
  - `mou` → MoU / Kerja Sama
- **Dua opsi berkas**: unggah PDF ke Supabase Storage **atau** tempel URL
  (Drive/OneDrive).
- Filter/pencarian berdasarkan kategori & tahun akademik (`YYYY/YYYY`).

### D. Modul Dasbor & Pelaporan

- **Statistik** kartu dashboard per role + grafik:
  - Surat per bulan (6 bulan terakhir).
  - Sebaran status skripsi (pending/approved/rejected).
- **Ekspor rekap** ke **Excel (.xlsx multi-sheet)** dan **PDF**.

### E. Fitur Pelengkap

- **Notifikasi in-app** (lonceng di header) — dihitung langsung dari keadaan
  basis data tiap permintaan, tanpa tabel notifikasi & tanpa penanda
  "sudah dibaca".
- **Riwayat keputusan Kaprodi** — kartu di dasbor Kaprodi.
- **Halaman validasi publik** `/validasi/[token]` — siapa pun bisa memindai QR
  surat untuk memeriksa keaslian tanpa login.

### F. Modul Data Akademik (Whitelist Pendaftaran)

- **Master data prodi** — admin mengimpor daftar resmi:
  - `NAMA;NIM` untuk mahasiswa.
  - `NAMA;NIDN` untuk dosen (termasuk Kaprodi).
- **Dua cara input**: satu per satu, atau **impor massal** (tempel banyak baris;
  pemisah `;`, `|`, atau tab — aman untuk nama bergelar yang mengandung koma).
- **Impor lewat file** (tanpa membuka browser): isi
  [`data/mahasiswa.txt`](./data/README.md) & [`data/dosen.txt`](./data/README.md),
  lalu `npm run db:import:dry` (cek) dan `npm run db:import` (simpan). Skrip juga
  menerima hasil export Excel berformat `.csv`/`.tsv` (kolom terakhir = NIM/NIDN,
  kolom `NO` & baris judul dibuang otomatis).
- **Pencocokan toleran**: NIM/NIDN dibandingkan tanpa titik/strip dan tidak peka
  huruf besar-kecil. Nama **tidak** dibandingkan karena tidak diketik user.
- **Nama tidak diketik user**: pendaftaran mahasiswa hanya meminta **NIM + email +
  password**, pembuatan akun Dosen/Kaprodi hanya **email + password + role +
  NIDN**. Nama akun diambil dari master data sehingga selalu seragam dan tidak
  bisa dipalsukan.
- **Efek whitelist**:
  - `/register` menolak NIM yang tidak ada di master data.
  - Pembuatan akun Dosen/Kaprodi oleh admin menolak NIDN yang tidak ada di
    master data.
  - Satu NIM/NIDN hanya bisa dipakai **sekali** (kolom `claimed_at`).
- **Sinkronisasi akun lama** — setiap kali data diimpor/ditambah, sistem
  menandai baris yang NIM/NIDN-nya sudah dipakai akun yang dibuat sebelum fitur
  ini ada, sehingga tidak tampil "belum punya akun" dan tidak bisa diklaim dua
  kali.
- Data yang sudah dipakai membuat akun **tidak dapat dihapus**.
- **Nama akun selalu mengikuti master data**: bila admin memperbaiki salah ketik
  nama di Data Akademik, nama akun yang terhubung ikut terkoreksi pada impor
  berikutnya (pemilik akun tidak bisa mengubah namanya sendiri).

---

## 6. Skema Database

Didefinisikan di [`db/schema.ts`](./db/schema.ts) memakai Drizzle ORM.
Migrasi SQL ada di folder [`drizzle/`](./drizzle/).

### Enum (tipe pilihan)

| Enum | Nilai |
| --- | --- |
| `user_role` | `mahasiswa`, `admin`, `kaprodi`, `dosen` |
| `letter_type` | `active_student`, `research_introduction`, `internship_introduction` |
| `letter_status` | `pending_staff`, `pending_kaprodi`, `approved`, `rejected` |
| `thesis_status` | `pending`, `approved`, `rejected` |
| `seminar_type` | `proposal`, `result`, `final` |
| `archive_category` | `sk_rektor`, `sk_mengajar`, `akreditasi`, `mou` |
| `member_type` | `mahasiswa`, `dosen` |

### Tabel `users`

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid (PK) | auto-generate |
| `email` | varchar(255) | **unik**, wajib |
| `password_hash` | text | hash bcrypt, wajib |
| `name` | varchar(255) | wajib |
| `role` | enum `user_role` | default `mahasiswa` |
| `nim` | varchar(30) | khusus mahasiswa (wajib saat pendaftaran) |
| `nidn` | varchar(30) | khusus dosen/kaprodi (wajib saat dibuat admin) |
| `created_at` | timestamptz | otomatis |
| `updated_at` | timestamptz | otomatis (on update) |

### Tabel `campus_members` (data akademik / whitelist)

Sumber kebenaran siapa yang boleh punya akun. Diisi admin lewat
`/admin/data-akademik`.

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid (PK) | auto-generate |
| `member_type` | enum `member_type` | `mahasiswa` atau `dosen` |
| `name` | varchar(255) | nama resmi (dipakai sebagai nama akun) |
| `identifier` | varchar(30) | **NIM** (mahasiswa) / **NIDN** (dosen) |
| `claimed_at` | timestamptz | terisi saat data dipakai membuat akun (sekali pakai) |
| `claimed_by_user_id` | uuid (FK → users) | akun yang memakai data ini |
| `created_by_id` | uuid (FK → users) | admin yang mengimpor |
| `created_at` | timestamptz | otomatis |
| `updated_at` | timestamptz | otomatis (on update) |

**Index unik** `(member_type, identifier)` — mencegah NIM/NIDN ganda dalam satu jenis.

### Tabel `letter_requests` (pengajuan surat)

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users) | pemohon; cascade delete |
| `letter_type` | enum `letter_type` | wajib |
| `purpose` | text | keperluan, wajib |
| `destination` | text | instansi tujuan (opsional) |
| `notes` | text | keterangan tambahan (opsional) |
| `status` | enum `letter_status` | default `pending_staff` |
| `staff_verified_by_id` | uuid (FK → users) | staf yang memverifikasi |
| `verified_at` | timestamptz | waktu verifikasi |
| `kaprodi_approved_by_id` | uuid (FK → users) | kaprodi penandatangan |
| `approved_at` | timestamptz | waktu persetujuan |
| `document_number` | varchar(60) | contoh `TI/2026/001` |
| `document_url` | text | URL PDF (storage / route dinamis) |
| `qr_token` | varchar(64) | **unik**, token QR |
| `rejection_reason` | text | alasan penolakan |
| `created_at`, `updated_at` | timestamptz | |

Index: `letter_requests_user_idx` (user_id), `letter_requests_status_idx` (status).

### Tabel `thesis_submissions` (usulan judul skripsi)

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users) | mahasiswa; cascade delete |
| `title` | text | judul usulan, wajib |
| `summary` | text | ringkasan, wajib |
| `status` | enum `thesis_status` | default `pending` |
| `decided_by_id` | uuid (FK → users) | kaprodi yang memutuskan |
| `decided_at` | timestamptz | waktu keputusan |
| `rejection_reason` | text | alasan penolakan |
| `pembimbing1_id` | uuid (FK → users) | dosen pembimbing 1 |
| `pembimbing2_id` | uuid (FK → users) | dosen pembimbing 2 (opsional) |
| `pembimbing_assigned_at` | timestamptz | waktu penetapan |
| `created_at`, `updated_at` | timestamptz | |

Index: `thesis_submissions_user_idx`, `thesis_submissions_status_idx`.

### Tabel `seminar_schedules` (jadwal seminar/ujian)

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `thesis_submission_id` | uuid (FK → thesis_submissions) | opsional, dapat `null` |
| `seminar_type` | enum `seminar_type` | wajib |
| `held_at` | timestamptz | tanggal & waktu, wajib |
| `location` | text | ruang (opsional) |
| `notes` | text | dosen penguji / keterangan (opsional) |
| `published_by_id` | uuid (FK → users) | admin yang publikasi |
| `created_at`, `updated_at` | timestamptz | |

Index: `seminar_schedules_type_idx`, `seminar_schedules_held_at_idx`.

### Tabel `archive_documents` (arsip digital)

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | uuid (PK) | |
| `category` | enum `archive_category` | wajib |
| `title` | varchar(255) | judul dokumen, wajib |
| `description` | text | deskripsi (opsional) |
| `file_url` | text | URL dokumen (storage/eksternal), wajib |
| `academic_year` | varchar(9) | format `YYYY/YYYY` (opsional) |
| `uploaded_by_id` | uuid (FK → users) | admin pengunggah |
| `created_at`, `updated_at` | timestamptz | |

Index: `archive_documents_category_idx`, `archive_documents_year_idx`.

---

## 7. Alur Bisnis End-to-End

> Prasyarat: admin sudah mengimpor **Data Akademik** (`/admin/data-akademik`)
> berisi NAMA/NIM mahasiswa dan NAMA/NIDN dosen. Tanpa data ini pendaftaran
> mandiri mahasiswa dan pembuatan akun dosen akan ditolak.

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. MAHASISWA                                                          │
│    • Daftar mandiri (/register) — NIM wajib terdaftar, nama otomatis  │
│    • Ajukan surat ATAU usulkan judul skripsi                          │
└───────────────────────────────┬──────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 2. STAF ADMIN (surat)                                                 │
│    • Verifikasi berkas → status jadi "Menunggu TTD Kaprodi"           │
│    • Publikasi & sunting jadwal seminar/ujian                         │
└───────────────────────────────┬──────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 3. KAPRODI                                                            │
│    • Setujui surat → nomor dokumen + token QR + PDF ber-QR terbit     │
│    • Setujui / tolak judul skripsi                                    │
│    • Tetapkan Dosen Pembimbing 1 & 2                                  │
└───────────────────────────────┬──────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 4. VERIFIKASI PUBLIK                                                  │
│    Mahasiswa unduh PDF ber-QR; pihak eksternal memindai QR            │
│    → /validasi/<token> (tanpa login) membuktikan keaslian surat.      │
└──────────────────────────────────────────────────────────────────────┘
```

**Status alur surat:**

```
pending_staff ──(admin verifikasi)──► pending_kaprodi ──(kaprodi setujui)──► approved
      │                                        │
      └──(admin tolak)──► rejected ◄──(kaprodi tolak)──┘
```

**Status alur skripsi:**

```
pending ──(kaprodi setujui)──► approved ──(kaprodi tetapkan pembimbing)──► selesai
   └────(kaprodi tolak)────► rejected
```

---

## 8. Halaman & Route

### Halaman publik (tanpa login)

| Route | Fungsi |
| --- | --- |
| `/` | Redirect ke `/<role>` bila sudah login, atau `/login` |
| `/login` | Masuk (kredensial email + password) |
| `/register` | Daftar akun mahasiswa mandiri (cukup NIM + email; nama diambil dari Data Akademik) |
| `/validasi/[token]` | Halaman publik verifikasi keaslian surat (target QR) |

### Halaman internal (wajib login, per role)

| Role | Route | Fungsi |
| --- | --- | --- |
| Semua | `/<role>` | Dasbor ringkasan + statistik |
| Mahasiswa | `/mahasiswa/surat` | Daftar & status pengajuan surat |
| Mahasiswa | `/mahasiswa/surat/baru` | Formulir ajukan surat |
| Mahasiswa | `/mahasiswa/skripsi` | Usulan judul skripsi |
| Mahasiswa | `/mahasiswa/jadwal` | Jadwal seminar |
| Admin | `/admin/surat` | Verifikasi surat |
| Admin | `/admin/jadwal` | Publikasi & sunting jadwal seminar |
| Admin | `/admin/arsip` | Kelola arsip digital |
| Admin | `/admin/data-akademik` | Master data NAMA/NIM & NAMA/NIDN + impor massal |
| Admin | `/admin/users` | Buat akun dosen/kaprodi |
| Admin | `/admin/laporan` | Laporan & rekap + ekspor |
| Kaprodi | `/kaprodi/surat` | Persetujuan surat & TTD |
| Kaprodi | `/kaprodi/skripsi` | Persetujuan judul & penetapan pembimbing |
| Kaprodi | `/kaprodi/laporan` | Monitoring laporan prodi |
| Dosen | `/dosen/surat` | Surat & SK (arsip SK Mengajar) |
| Dosen | `/dosen/bimbingan` | Mahasiswa bimbingan + jadwal seminar |

### Route API

| Route | Method | Fungsi |
| --- | --- | --- |
| `/api/auth/[...nextauth]` | GET/POST | Handler NextAuth |
| `/api/surat/[id]/pdf` | GET | Unduh PDF surat ber-QR (dibuat ulang saat diminta) |
| `/api/laporan/export?format=excel\|pdf` | GET | Ekspor laporan (hanya admin & kaprodi) |

---

## 9. Server Actions (Logika Backend)

Semua mutasi data memakai **Server Actions** di [`lib/actions/`](./lib/actions/).
Setiap action diawali pengaman `requireRole(...)`.

### `lib/actions/auth.ts`

| Action | Fungsi |
| --- | --- |
| `login` | Validasi kredensial → redirect ke `/<role>` |
| `register` | Daftar mahasiswa baru: NIM harus ada di `campus_members` & belum dipakai, email unik, password min 6; nama akun diambil dari master data |
| `logout` | Keluar & redirect ke `/login` |

### `lib/actions/users.ts`

| Action | Fungsi | Role |
| --- | --- | --- |
| `createStaffAccount` | Buat akun Dosen/Kaprodi; NIDN wajib cocok dengan Data Akademik dan belum dipakai | admin |

### `lib/actions/members.ts` (Data Akademik)

| Action | Fungsi | Role |
| --- | --- | --- |
| `createCampusMember` | Tambah satu data akademik (jenis, nama, NIM/NIDN); upsert bila NIM/NIDN sudah ada | admin |
| `bulkImportMembers` | Impor massal: textarea mahasiswa (`NAMA;NIM`) & dosen (`NAMA;NIDN`) | admin |
| `deleteCampusMember` | Hapus data yang belum dipakai membuat akun | admin |

Pencocokan nama/identitas ada di [`lib/members.ts`](./lib/members.ts)
(`normalizeIdentifier`, `parseBulkRows`), sedangkan pembacaan
data memakai [`lib/queries/members.ts`](./lib/queries/members.ts)
(`findCampusMember`). Setelah impor, `syncClaimedFromExistingUsers()` (internal)
menandai data yang NIM/NIDN-nya sudah terpakai akun lama.

### `lib/actions/letters.ts`

| Action | Fungsi | Role |
| --- | --- | --- |
| `submitLetter` | Mahasiswa ajukan surat baru | mahasiswa |
| `verifyLetter` | Verifikasi berkas → `pending_kaprodi` | admin |
| `approveLetter` | Setujui + buat nomor dokumen, QR token, PDF | kaprodi |
| `rejectLetter` | Tolak surat + alasan (maks 500 karakter) | admin/kaprodi |

### `lib/actions/thesis.ts`

| Action | Fungsi | Role |
| --- | --- | --- |
| `submitThesis` | Usulkan judul + ringkasan (judul 10–300, ringkasan 20–3000) | mahasiswa |
| `decideThesis` | Setujui / tolak usulan judul | kaprodi |
| `assignPembimbing` | Tetapkan Pembimbing 1 (& 2 opsional) | kaprodi |

### `lib/actions/seminars.ts`

| Action | Fungsi | Role |
| --- | --- | --- |
| `publishSeminar` | Publikasi jadwal seminar baru | admin |
| `updateSeminar` | Sunting jadwal (jenis, waktu, ruang, penguji) | admin |
| `deleteSeminar` | Hapus/batalkan jadwal | admin |

### `lib/actions/archives.ts`

| Action | Fungsi | Role |
| --- | --- | --- |
| `createArchiveDocument` | Simpan dokumen (unggah PDF atau URL) | admin |
| `deleteArchiveDocument` | Hapus dokumen (+ objek storage best-effort) | admin |

---

## 10. Lapisan Query & Laporan

### Query baca — [`lib/queries/`](./lib/queries/)

Semua file diawali `import "server-only"` sehingga hanya boleh dipanggil dari
Server Component / Server Action.

| File | Fungsi |
| --- | --- |
| `stats.ts` | Statistik dasbor per role, grafik surat/bulan & skripsi/status, `getLaporanStats` |
| `notifications.ts` | Notifikasi in-app per role (lonceng header) |
| `decisions.ts` | Riwayat keputusan Kaprodi |
| `bimbingan.ts` | Mahasiswa bimbingan dosen + jadwal seminarnya |
| `seminars.ts` | Daftar jadwal seminar & opsi mahasiswa (judul disetujui) |

**Kunci metrik statistik** (`StatKey`): `letters_in_process`, `letters_done`,
`thesis_total`, `notifications_recent`, `letters_pending_staff`,
`letters_pending_kaprodi`, `archive_total`, `users_total`, `letters_this_month`,
`thesis_pending`, `letters_approved`, `thesis_supervised`,
`archive_sk_mengajar`, `seminars_upcoming`.

### Laporan — [`lib/reports/`](./lib/reports/)

| File | Fungsi |
| --- | --- |
| `laporan-types.ts` | Tipe data bersama ekspor (bebas `server-only`, bisa diuji mandiri) |
| `laporan-data.ts` | Ambil & rekap data dari basis data |
| `laporan-xlsx.ts` | Bangun berkas Excel `.xlsx` multi-sheet |
| `laporan-pdf.ts` | Bangun berkas PDF laporan |

Isi ekspor: Ringkasan (statistik + grafik tabular), Rekap Surat, Rekap Skripsi,
Rekap Arsip, Rekap Seminar.

---

## 11. PDF Surat & Validasi QR

### Generator PDF — [`lib/pdf/`](./lib/pdf/)

- `letter-document.ts` — `buildLetterPdf()` membangun surat resmi A4 berisi:
  kop universitas, judul, nomor dokumen, badan surat (nama, NIM, prodi,
  keperluan, instansi tujuan), kalimat penutup sesuai jenis surat, tanda tangan
  elektronik Kaprodi (+ NIDN), dan **QR Code validasi**.
- `letter-text.ts` — `pdfSafeText()` & `wrapText()`: membersihkan karakter
  tipografi/Unicode yang tidak didukung font standar PDF (WinAnsi) agar
  `drawText` tidak error.

### Nomor dokumen & token QR

- Format nomor: `TI/<tahun>/<urut 3 digit>` — urut dihitung dari jumlah surat
  `approved` pada tahun berjalan (contoh `TI/2026/001`).
- Token QR: `randomUUID()` tanpa tanda hubung, dipotong 32 karakter.

### Validasi keaslian

- QR pada PDF mengarah ke `{APP_URL}/validasi/<qrToken>`.
- Halaman `/validasi/[token]` membaca data surat + pemohon dari basis data
  lalu menampilkan status keasliannya **tanpa perlu login**.

### Unduh PDF

- Jika **Supabase Storage aktif**: PDF diunggah sekali saat disetujui, dan
  `document_url` menyimpan URL publik permanen.
- Jika **belum aktif**: PDF dibuat ulang saat diminta lewat
  `/api/surat/[id]/pdf` (hak akses: pemilik surat, admin, kaprodi).

---

## 12. Penyimpanan Berkas (Supabase Storage)

Diimplementasikan di [`lib/storage.ts`](./lib/storage.ts) memakai REST Storage.

| Konstanta | Nilai |
| --- | --- |
| Ukuran maksimal arsip | 10 MB (`ARCHIVE_MAX_BYTES`) |
| Bucket default | `arsip-prodi` |
| Tipe diizinkan | `application/pdf` |

- Upload via `POST {SUPABASE_URL}/storage/v1/object/{bucket}/{path}`
  dengan header `Authorization: Bearer {service_role_key}`.
- Path objek: `arsip/<tahun>/<uuid>-<nama>` dan `surat/<tahun>/<uuid>-<nama>`.
- Tanpa kredensial storage, fitur upload dinonaktifkan dan modul arsip tetap
  bisa menyimpan dokumen lewat **URL eksternal** (Drive/OneDrive).
- Batas ukuran body Server Action dinaikkan jadi **10 MB** di `next.config.ts`.

---

## 13. Autentikasi & Keamanan

- **NextAuth (Auth.js)** dengan `Credentials` provider; password di-hash
  **bcrypt** (round 10).
- Strategi sesi **JWT**; `id` & `role` disimpan dalam token dan sesi
  (lihat `types/next-auth.d.ts`).
- Halaman login kustom: `/login`.
- **Middleware** `proxy.ts` melindungi route per role.
- **Double guard**: layout `[role]` + `requireRole()` di server actions.
- Pendaftaran mandiri dibatasi hanya untuk role `mahasiswa`.
- **Whitelist pendaftaran**: `register()` dan `createStaffAccount()` hanya
  memvalidasi NIM/NIDN terhadap tabel `campus_members` (nama tidak diketik
  user, diambil dari baris master data), lalu menandai baris tersebut sebagai
  terpakai (`claimed_at`) di dalam transaksi yang sama. Percobaan memakai
  NIM/NIDN yang sama dua kali akan gagal.

---

## 14. Variabel Lingkungan (.env)

Contoh lengkap ada di [`.env.example`](./.env.example). File `.env` diabaikan git.

| Variabel | Wajib | Fungsi |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Koneksi Supabase PostgreSQL (pakai connection string pooler) |
| `AUTH_SECRET` | ✅ | Kunci enkripsi sesi NextAuth |
| `SUPABASE_URL` | opsional | URL project Supabase (untuk Storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | opsional | Service role key (RAHASIA, server-side) |
| `SUPABASE_STORAGE_BUCKET` | opsional | Nama bucket (default `arsip-prodi`) |
| `APP_URL` | opsional | Basis URL absolut untuk QR (`{APP_URL}/validasi/{token}`) |

> Catatan: koneksi DB memakai `prepare: false` karena pooler Supabase tidak
> mendukung prepared statements.

---

## 15. Cara Menjalankan

```bash
npm install
cp .env.example .env     # isi DATABASE_URL & AUTH_SECRET (opsional Supabase)
npm run db:migrate       # terapkan skema ke Supabase
npm run db:seed          # buat akun contoh semua role
npm run db:check         # verifikasi isi tabel & jumlah akun per role
npm run dev              # jalankan di http://localhost:3000
```

### Perintah npm yang tersedia

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Jalankan server pengembangan (`next dev`) |
| `npm run build` | Build produksi (`next build`) |
| `npm run start` | Jalankan hasil build (`next start`) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Buat file migrasi baru dari perubahan `db/schema.ts` |
| `npm run db:migrate` | Terapkan migrasi ke database |
| `npm run db:push` | Sinkronkan schema langsung (tanpa file migrasi) |
| `npm run db:check` | Tampilkan jumlah baris per tabel & akun per role |
| `npm run db:seed` | Buat akun contoh (idempoten) |
| `npm run db:import` | Impor data akademik dari `data/mahasiswa.txt` & `data/dosen.txt` |
| `npm run db:import:dry` | Cek hasil impor tanpa menulis ke database |
| `npm run pdf:check` | Uji generator PDF surat + baca ulang QR |
| `npm run laporan:check` | Uji ekspor laporan Excel & PDF |
| `npm run pelengkap:check` | Uji fitur pelengkap (notifikasi, riwayat, bimbingan) |

---

## 16. Akun Contoh (Seed)

Dibuat oleh [`scripts/seed.ts`](./scripts/seed.ts) (idempoten — email yang sudah
ada dilewati). **Ganti password saat produksi!**

| Role | Email | Password | NIM/NIDN |
| --- | --- | --- | --- |
| Admin | `admin@umpar.ac.id` | `admin123` | — |
| Kaprodi | `kaprodi@umpar.ac.id` | `kaprodi123` | `0912123401` |
| Dosen | `dosen@umpar.ac.id` | `dosen123` | `0912123402` |
| Mahasiswa | `mahasiswa@umpar.ac.id` | `mahasiswa123` | `2201010001` |

---

## 17. Skrip Pemeriksa

| Skrip | Keluaran | Isi pemeriksaan |
| --- | --- | --- |
| `scripts/db-check.ts` | teks konsol | Jumlah baris per tabel & akun per role |
| `scripts/import-members.ts` | teks konsol | Impor data akademik dari file teks (lihat `data/README.md`) |
| `scripts/pdf-check.ts` | `tmp/pdf-check/` | Bangun PDF surat, baca ulang, dekode QR |
| `scripts/laporan-check.ts` | `tmp/laporan-check/` | Bangun `.xlsx` + `.pdf`, baca ulang isinya |
| `scripts/pelengkap-check.ts` | konsol | Sisip uji notifikasi/riwayat/bimbingan lalu hapus kembali |

> `pelengkap-check` dijalankan dengan kondisi `react-server` karena
> `lib/queries/*` memakai `server-only`.

Skrip UI end-to-end lokal ada di folder `tmp/` (diabaikan git):

- `node tmp/login-check.cjs` → uji login 4 role + penolakan lintas role.
- `node tmp/jadwal-check.cjs` → uji empty state & sunting jadwal.
- `node tmp/register-check.cjs` → uji pendaftaran mandiri (NIM saja, nama dari
  Data Akademik). Variabel `TEST_NIM`, `TEST_EMAIL`, `TEST_PASSWORD`.

---

## 18. Catatan & Konvensi Penting

1. **Server vs Client Component** — file diawali `"use client"` hanya untuk
   form/interaksi. Query database memakai `import "server-only"`.
2. **Validasi ganda** — dilakukan di HTML (`required`, `minLength`) **dan** di
   server action (sumber kebenaran).
3. **RBAC berlapis** — middleware → layout role → `requireRole()` di action.
4. **Notifikasi tanpa tabel** — diturunkan dari keadaan DB tiap permintaan,
   tanpa penanda "sudah dibaca".
5. **PDF aman** — semua teks dari DB lewat `pdfSafeText()` sebelum digambar.
6. **Format tanggal** — `id-ID` via `lib/format.ts`.
7. **Tahun akademik** — wajib format `YYYY/YYYY`, tahun kedua = pertama + 1.
8. **Batas karakter penting**:
   - Keperluan surat: maks 1000.
   - Alasan penolakan: maks 500.
   - Judul skripsi: 10–300; ringkasan: 20–3000.
   - Ruang seminar: maks 150; keterangan: maks 500.
   - Judul arsip: 3–255; deskripsi: maks 1000.

---

## 19. Status Modul (per PRD)

| Modul | Status | Catatan |
| --- | --- | --- |
| A. Layanan Surat (E-Service) | ✅ Aktif | Pengajuan → verifikasi staf → TTD Kaprodi; nomor, QR, PDF otomatis |
| B. Tugas Akhir / Skripsi | ✅ Aktif | Usulan judul, keputusan Kaprodi, penetapan pembimbing 1 & 2 |
| B. Jadwal Seminar/Ujian | ✅ Aktif | Admin publikasi/sunting/batalkan; mahasiswa & dosen melihat |
| C. Arsip Digital | ✅ Aktif | Kategori & tahun akademik; unggah PDF atau URL |
| D. Dasbor & Pelaporan | ✅ Aktif | Angka + grafik; ekspor Excel & PDF |
| Validasi keaslian surat | ✅ Aktif | PDF ber-QR → `/validasi/[token]` (tanpa login) |
| Notifikasi in-app | ✅ Aktif | Lonceng di header per role |
| Riwayat keputusan Kaprodi | ✅ Aktif | Kartu riwayat di dasbor Kaprodi |
| Modul bimbingan dosen | ✅ Aktif | `/dosen/bimbingan` |
| F. Data Akademik (whitelist) | ✅ Aktif | Admin impor NAMA/NIM & NAMA/NIDN; pendaftaran & akun dosen divalidasi |
| Jadwal perkuliahan | ❌ Tidak ada | Sistem hanya untuk jadwal **seminar/ujian skripsi** |

---

## Lampiran — Data yang Perlu Disiapkan

Saat mengumpulkan data untuk di-input ke sistem:

1. **Daftar Dosen** → `NAMA;NIDN` (impor massal di menu Data Akademik).
2. **Data Kaprodi** → `NAMA;NIDN` (Kaprodi juga dosen, jadi masuk daftar dosen).
3. **Daftar Mahasiswa** → `NAMA;NIM` (wajib; mahasiswa daftar sendiri di
   `/register` hanya dengan NIM + email, nama akun mengikuti kolom NAMA di sini).

> Format impor: satu baris satu orang, pemisah `;`, `|`, atau tab. Koma aman
> dipakai di dalam gelar (mis. `Dr. Andi, M.Kom.;0912345678`).
> Contoh: lihat `components/member-forms.tsx`.
4. **Jadwal seminar/ujian** → jenis (proposal/hasil/tutup), tanggal & waktu,
   ruang, dosen penguji.
5. **Dokumen arsip** → SK Rektor, SK Mengajar, Sertifikat Akreditasi, MoU
   (format PDF).

> ❌ Jadwal perkuliahan / mata kuliah / KRS-KHS **tidak** dipakai sistem ini.

---

*Dokumen ini dibuat berdasarkan pembacaan langsung kode sumber project.
Untuk kebutuhan produk lengkap, rujuk [`PRD.MD`](./PRD.MD).*

