This is the repository for **SIMAP TI UMPAR** — Sistem Informasi Manajemen
Administrasi Program Studi Teknik Informatika, Universitas Muhammadiyah
Parepare. Kebutuhan produk lengkap ada di [`PRD.MD`](./PRD.MD).

## Stack

- Next.js (App Router, TypeScript) + Tailwind CSS
- Supabase (PostgreSQL) + Drizzle ORM (Drizzle Kit untuk migrasi)
- NextAuth.js (Auth.js) dengan kredensial + bcrypt
- `pdf-lib` + `qrcode` untuk generator surat PDF ber-QR Code (validasi keaslian)
- `exceljs` + `pdf-lib` untuk ekspor laporan rekap (Excel `.xlsx` & PDF)

## Getting Started

```bash
npm install
cp .env.example .env   # isi DATABASE_URL & AUTH_SECRET
npm run db:migrate     # terapkan schema ke Supabase (drizzle-kit migrate)
npm run db:seed        # buat akun contoh semua role
npm run db:check       # verifikasi isi tabel & jumlah akun per role
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Perintah basis data & pemeriksa

| Perintah | Fungsi |
| --- | --- |
| `npm run db:generate` | Membuat file SQL migrasi baru dari perubahan `db/schema.ts` |
| `npm run db:migrate` | Menerapkan migrasi yang belum dijalankan ke database |
| `npm run db:push` | Sinkronisasi schema langsung (tanpa file migrasi) — untuk eksperimen |
| `npm run db:check` | Menampilkan jumlah baris per tabel & akun per role |
| `npm run db:seed` | Membuat akun contoh (idempoten, akun yang sudah ada dilewati) |
| `npm run pdf:check` | Memeriksa generator surat PDF: membangun contoh surat, membaca ulang berkas, dan mendekode ulang QR Code |
| `npm run laporan:check` | Memeriksa ekspor laporan: membangun contoh `.xlsx` + `.pdf`, lalu membaca ulang isinya |
| `npm run pelengkap:check` | Memeriksa pelengkap opsional (notifikasi in-app, riwayat keputusan Kaprodi, bimbingan dosen) dengan menyisipkan satu skenario uji lalu menghapusnya kembali |

`pelengkap:check` dijalankan dengan kondisi `react-server` (lihat
`package.json`) karena `lib/queries/*` diawali penanda `import "server-only"`
seperti pada aplikasi.

Skrip `pdf:check` dan `laporan:check` menulis berkas contoh ke `tmp/pdf-check/`
dan `tmp/laporan-check/` agar dapat dibuka manual. Skrip `pelengkap:check`
menyisipkan skenario uji ke basis data lalu menghapusnya kembali, sehingga
aman dijalankan berulang.

### Pemeriksa UI (end-to-end lokal)

Skrip di folder `tmp/` (diabaikan git, dipakai saat pengembangan) menguji
halaman melalui HTTP dengan akun hasil seed. Jalankan `npm run dev` lebih
dahulu, lalu dari akar proyek:

| Perintah | Keluaran | Isi pemeriksaan |
| --- | --- | --- |
| `node tmp/login-check.cjs` | `step4-pages.log` | Login 4 role, penanda halaman tiap modul, penolakan lintas role (`/kaprodi` → 307 untuk admin, dst.), dan ekspor Excel admin |
| `node tmp/jadwal-check.cjs` | `jadwal-check.log` | Empty state jadwal, tombol **Edit Jadwal** beserta nilai `datetime-local` hasil penyuntingan, pembersihan data uji, dan penegasan bahwa route bantu uji sudah tidak ada |

`node tmp/run-with-exit.cjs <berkas.log> <perintah...>` hanya membungkus
perintah agar *exit code*-nya tercatat (Windows).

Data uji kedua skrip disisipkan langsung ke basis data dan dihapus kembali,
sehingga tidak diperlukan endpoint pengujian di dalam aplikasi.

### Variabel lingkungan

| Variabel | Wajib | Fungsi |
| --- | --- | --- |
| `DATABASE_URL` | ya | Koneksi Supabase PostgreSQL |
| `AUTH_SECRET` | ya | Kunci enkripsi sesi NextAuth |
| `APP_URL` | tidak | Basis URL absolut untuk QR Code surat. Kosong = pakai host permintaan (lokal `http://localhost:3000`) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | tidak | Supabase Storage untuk berkas arsip & PDF surat. Bila kosong, arsip memakai input URL dan PDF surat dibuat saat diminta |

Akun hasil seed: `admin@umpar.ac.id / admin123`, `kaprodi@umpar.ac.id / kaprodi123`,
`dosen@umpar.ac.id / dosen123`, `mahasiswa@umpar.ac.id / mahasiswa123`.

## Navigasi per Role (RBAC)

Satu-satunya sumber kebenaran menu adalah [`lib/navigation.ts`](./lib/navigation.ts)
(`ROLE_NAV`, `ROLE_META`, `quickLinksFor`). Sidebar, kartu modul di dasbor, dan
halaman awal setiap role dibaca dari konfigurasi tersebut, sehingga penambahan
menu cukup dilakukan satu kali.

| Role | Halaman awal | Menu sidebar |
| --- | --- | --- |
| `mahasiswa` | `/mahasiswa` | Dasbor, Pengajuan Surat (`/mahasiswa/surat`, `/surat/baru`), Pengajuan Skripsi (`/mahasiswa/skripsi`), Jadwal Seminar (`/mahasiswa/jadwal`) |
| `admin` | `/admin` | Dasbor, Verifikasi Surat (`/admin/surat`), Jadwal Seminar (`/admin/jadwal`), Arsip Digital (`/admin/arsip`), Manajemen Pengguna (`/admin/users`), Laporan & Rekap (`/admin/laporan`) |
| `kaprodi` | `/kaprodi` | Dasbor, Persetujuan Surat & TTD (`/kaprodi/surat`), Penetapan Pembimbing (`/kaprodi/skripsi`), Laporan Prodi (`/kaprodi/laporan`) |
| `dosen` | `/dosen` | Dasbor, Surat & SK (`/dosen/surat`), Bimbingan (`/dosen/bimbingan`) |

Pengamanan akses berlapis:

1. `proxy.ts` (Next.js 16 menggantikan `middleware.ts`) mencocokkan seluruh
   prefix `/<role>` untuk menyegarkan sesi.
2. `app/(app)/layout.tsx` memanggil `requireUser()` → redirect ke `/login`.
3. `app/(app)/[role]/layout.tsx` menolak URL role yang tidak sesuai akun.
4. Setiap server action memakai `requireRole(...)` di [`lib/dal.ts`](./lib/dal.ts).

## Route Publik (tanpa login)

| Route | Fungsi |
| --- | --- |
| `/login`, `/register` | Masuk & pendaftaran mandiri (hanya mahasiswa) |
| `/validasi/[token]` | Verifikasi keaslian surat via QR Code (`letter_requests.qr_token`) |

## Unduhan Dokumen Surat

| Route | Fungsi |
| --- | --- |
| `/api/surat/[id]/pdf` | PDF surat ber-QR dibuat saat diminta (dinamis). Dibatasi untuk pemilik surat, staf administrasi, dan Kaprodi |
| `?download=1` | Mengubah `Content-Disposition` menjadi unduhan (default: tampil di penampil PDF) |

## Ekspor Laporan (PRD §3D)

| Route | Fungsi |
| --- | --- |
| `/api/laporan/export?format=excel` | Berkas `.xlsx` lima lembar: Ringkasan, Rekap Surat, Rekap Skripsi, Rekap Arsip, Jadwal Seminar |
| `/api/laporan/export?format=pdf` | Berkas PDF A4 lanskap: ringkasan statistik, grafik tabular, dan seluruh tabel rekap (maks. 40 baris per tabel) |

Hanya untuk **admin** dan **Kaprodi**; isinya dihitung saat berkas diminta
sehingga selalu sesuai basis data. Tombol **Ekspor Excel** / **Ekspor PDF**
tersedia di halaman `/<admin|kaprodi>/laporan`.

Alur dokumen pada `approveLetter`:

1. Kaprodi menekan **Setujui & TTD** → nomor dokumen (`TI/<tahun>/<urut>`) dan
   `qr_token` (32 karakter acak) diterbitkan.
2. `lib/pdf/letter-document.ts` membangun PDF A4 (kop prodi, judul, nomor,
   data pemohon, tanda tangan elektronik Kaprodi) dan menanam QR Code yang
   mengarah ke `/validasi/<qr_token>`.
3. Bila Supabase Storage dikonfigurasi, PDF diunggah ke `surat/<tahun>/…` dan
   URL publiknya disimpan di `letter_requests.document_url`. Bila tidak, kolom
   tersebut diisi `/api/surat/<id>/pdf` sehingga PDF tetap dapat diunduh
   (dibangun ulang dari data surat).

## Pelengkap Opsional (di luar alur inti)

Empat pelengkap yang memperkuat modul inti; semuanya sudah aktif:

| Pelengkap | Halaman | Berkas kunci | Catatan |
| --- | --- | --- | --- |
| Penyuntingan jadwal | `/admin/jadwal` | `lib/actions/seminars.ts` (`updateSeminar`, `deleteSeminar`), `components/seminar/seminar-table.tsx`, `lib/format.ts` (`toDateTimeLocalValue`) | Admin menyunting waktu/ruang/penguji langsung pada baris tabel (tanpa hapus–publikasi ulang) atau membatalkan jadwal |
| Notifikasi in-app | Lonceng pada header semua role | `lib/queries/notifications.ts`, `components/notification-bell.tsx`, dirakit di `app/(app)/layout.tsx` | Tanpa tabel notifikasi: isi diturunkan dari keadaan basis data setiap permintaan (antrian yang perlu ditindak, keputusan terbaru, jadwal mendatang, bimbingan baru) sehingga tidak perlu penanda "sudah dibaca" |
| Riwayat keputusan Kaprodi | `/kaprodi` | `lib/queries/decisions.ts`, `app/(app)/[role]/page.tsx`, `components/dashboard-page.tsx` | Daftar surat ber-TTD dan usulan judul terakhir yang diputuskan Kaprodi beserta hasil (disetujui/ditolak) dan keterangannya |
| Modul bimbingan dosen | `/dosen/bimbingan` | `lib/queries/bimbingan.ts`, `components/thesis/bimbingan-dosen-view.tsx` | Mahasiswa yang ditetapkan Kaprodi sebagai Pembimbing 1/2 beserta judul, status usulan, dan jadwal seminar mereka |

## Status Modul (per PRD)

| Modul | Status | Catatan |
| --- | --- | --- |
| A. Layanan Surat (E-Service) | **Aktif** | Pengajuan → verifikasi staf → TTD Kaprodi; nomor dokumen, token QR, dan PDF ber-QR terbit otomatis saat disetujui |
| B. Tugas Akhir / Skripsi | **Aktif** | Usulan judul mahasiswa, keputusan Kaprodi, penetapan Pembimbing 1 & 2 |
| B. Jadwal Seminar/Ujian | **Aktif** | Admin publikasikan (proposal/hasil/tutup), menyunting atau membatalkan jadwal; mahasiswa melihat jadwal, dosen memantau jadwal bimbingannya |
| C. Arsip Digital | **Aktif** | Kategori & filter tahun akademik; unggah PDF ke Supabase Storage atau tempel URL dokumen |
| D. Dasbor & Pelaporan | **Aktif** | Angka + grafik; ekspor Excel (`.xlsx` multi-lembar) & PDF berisi seluruh rekap |
| Validasi keaslian surat | **Aktif** | PDF ber-QR Code; QR memuat URL `/validasi/[token]` yang menampilkan data surat dari basis data |
| Notifikasi in-app | **Aktif** | Lonceng pada header per role (PRD §3A), lihat *Pelengkap Opsional* |
| Riwayat keputusan Kaprodi | **Aktif** | Kartu riwayat pada dasbor Kaprodi (PRD §3B) |
| Modul bimbingan dosen | **Aktif** | `/dosen/bimbingan` — mahasiswa bimbingan beserta jadwal seminar (PRD §2) |

Alur bisnis inti yang sudah berjalan end-to-end:

1. Mahasiswa mendaftar mandiri (`/register`), lalu mengajukan surat atau usulan judul skripsi.
2. Staf administrasi memverifikasi berkas surat dan mempublikasikan jadwal seminar (dapat disunting/dibatalkan tanpa hapus–publikasi ulang).
3. Kaprodi menyetujui surat (nomor dokumen + token QR + PDF ber-QR terbit) dan menetapkan Dosen Pembimbing 1 & 2.
4. Mahasiswa mengunduh PDF surat ber-QR; pihak eksternal memindai QR untuk memverifikasi keasliannya tanpa login.
5. Setiap role menerima notifikasi in-app; dosen memantau mahasiswa bimbingannya pada menu Bimbingan.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
