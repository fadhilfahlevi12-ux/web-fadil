# Product Requirements Document (PRD)
**Nama Produk:** Sistem Informasi Manajemen Administrasi Prodi (SIMAP) TI UMPAR
**Platform:** Web Application
**Versi:** 1.0

## 1. Latar Belakang & Tujuan
**Masalah:**
Saat ini, proses administrasi di Program Studi Teknik Informatika UMPAR (seperti pengajuan surat mahasiswa, arsip dokumen prodi, dan administrasi skripsi) masih dilakukan secara semi-manual. Hal ini rentan terhadap kehilangan dokumen, lambatnya proses persetujuan (tanda tangan), dan sulitnya pelacakan status.

**Tujuan (Objektif):**
* Mendigitalisasi layanan administrasi mahasiswa agar lebih cepat, transparan, dan dapat dilacak (*trackable*).
* Membangun bank data arsip digital untuk dokumen-dokumen penting prodi (berguna untuk akreditasi).
* Mempermudah Kaprodi dan Staf dalam memonitoring kegiatan akademik dan administrasi.

## 2. Target Pengguna (User Roles)
Sistem ini akan memiliki sistem otorisasi (*Role-Based Access Control*) untuk 4 jenis pengguna:
1. **Mahasiswa:** Mengajukan permohonan surat dan administrasi akademik.
2. **Staf Administrasi (Admin):** Memverifikasi berkas pengajuan, mengelola arsip, dan mencetak dokumen.
3. **Ketua Program Studi (Kaprodi):** Menyetujui (*approve*) pengajuan, memberikan tanda tangan digital, dan melihat laporan dasbor.
4. **Dosen (Opsional/Pengembangan):** Menerima SK Mengajar, surat tugas, atau mengelola persetujuan bimbingan.

> **Kebijakan Akun:** Pendaftaran mandiri (*self-register*) hanya tersedia untuk **Mahasiswa**. Akun **Dosen** dan **Kaprodi** dibuat oleh **Admin** melalui menu manajemen pengguna di dashboard admin. Akun **Admin** dibuat oleh pengembang melalui *seed script* (bootstrap).

## 3. Fitur Utama (Fungsionalitas)

### A. Modul Layanan Surat Mahasiswa (E-Service)
* **Pengajuan Surat:** Mahasiswa dapat mengajukan (Surat Keterangan Aktif Kuliah, Surat Pengantar Penelitian, Surat Pengantar Magang/KP).
* **Tracking Status:** Mahasiswa bisa melihat status surat (Menunggu Verifikasi Staf ➔ Menunggu TTD Kaprodi ➔ Selesai).
* **Notifikasi:** Peringatan di dasbor saat surat selesai diproses.
* **Download Dokumen:** Mahasiswa dapat mengunduh surat yang sudah ditandatangani dalam format PDF (dilengkapi *QR Code* untuk validasi).

### B. Modul Administrasi Tugas Akhir / Skripsi
* **Pengajuan Judul Skripsi:** Mahasiswa menginput usulan judul beserta ringkasan.
* **Penetapan Pembimbing:** Kaprodi dapat menyetujui judul dan menetapkan Dosen Pembimbing 1 dan 2.
* **Jadwal Seminar/Ujian:** Staf prodi dapat mempublikasikan jadwal Seminar Proposal, Hasil, dan Tutup.

### C. Modul Arsip Digital Prodi (E-Archive)
* **Penyimpanan Dokumen:** Upload dan manajemen dokumen resmi (SK Rektor, SK Mengajar Dosen, Sertifikat Akreditasi, MoU/Perjanjian Kerja Sama).
* **Kategorisasi & Pencarian:** Filter pencarian berdasarkan tahun akademik atau jenis dokumen.

### D. Modul Dasbor & Pelaporan
* **Statistik Visual:** Grafik jumlah pengajuan surat per bulan, jumlah mahasiswa aktif bimbingan skripsi.
* **Cetak Laporan:** Admin dapat mengekspor rekap administrasi ke dalam format Excel atau PDF.

## 4. Kebutuhan Non-Fungsional
* **Keamanan:** Password harus dienkripsi (misal: *Bcrypt*). Akses halaman harus dibatasi sesuai *role* (Mahasiswa tidak bisa masuk ke halaman Kaprodi).
* **Responsivitas:** Desain antarmuka (UI) harus responsif, artinya tetap nyaman diakses melalui *smartphone*.
* **Validasi Berkas:** PDF yang dihasilkan sistem harus memiliki *QR code* yang jika di-scan mengarah ke sistem UMPAR untuk membuktikan keaslian surat.

## 5. Tumpukan Teknologi (Tech Stack)
> **Catatan:** Stack final yang disepakati berbeda dari rekomendasi awal (Laravel/CodeIgniter). Aplikasi dibangun sebagai full-stack web dengan Next.js.

* **Framework (Frontend + Backend):** Next.js (App Router, TypeScript).
* **UI / Styling:** Tailwind CSS.
* **Database:** Supabase (PostgreSQL).
* **ORM:** Drizzle ORM (dengan Drizzle Kit untuk migrasi schema).
* **Autentikasi:** NextAuth.js (Auth.js) — password di-hash dengan bcrypt, akses dibatasi berdasarkan *role*.
* **Library Tambahan:** PDF generator (untuk *generate* surat PDF), QR Code (untuk validasi keaslian surat).