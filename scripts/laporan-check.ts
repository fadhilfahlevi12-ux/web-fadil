import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { Workbook, type Worksheet } from "exceljs";
import { PDFDocument } from "pdf-lib";

import { buildLaporanPdf } from "../lib/reports/laporan-pdf";
import { buildLaporanXlsx } from "../lib/reports/laporan-xlsx";
import {
  LAPORAN_TITLE,
  type LaporanExport,
} from "../lib/reports/laporan-types";
import { printedText, toArrayBuffer } from "./lib/pdf-inspect";

/**
 * Pemeriksa ekspor laporan Excel & PDF (PRD §3D).
 * Jalankan dengan: npm run laporan:check
 *
 * Yang diperiksa (tanpa menyentuh basis data — memakai data contoh):
 * 1. Excel: lembar, kepala tabel, tipe data angka, filter, dan isi baris.
 * 2. PDF: kop, ringkasan, setiap tabel rekap, sanitasi teks, dan footer
 *    nomor halaman.
 * Kedua berkas contoh ditulis ke `tmp/laporan-check/` untuk diperiksa manual.
 */

const OUT_DIR = path.join(process.cwd(), "tmp", "laporan-check");
const GENERATED_AT = new Date("2026-09-17T02:30:00.000Z");
const QR_TOKEN = "9f1c4b7a2d6e4f0a8b3c5d7e9f1a2b3c";

const failures: string[] = [];
let checks = 0;

function check(label: string, condition: boolean, detail?: string) {
  checks += 1;
  if (condition) {
    console.log(`  OK    ${label}`);
    return;
  }
  failures.push(`${label}${detail ? ` -> ${detail}` : ""}`);
  console.log(`  GAGAL ${label}${detail ? ` -> ${detail}` : ""}`);
}

/** Cari nomor baris berdasarkan isi kolom tertentu (1 = kolom pertama). */
function findRow(
  sheet: Worksheet,
  text: string,
  column = 1
): number | null {
  let found: number | null = null;
  sheet.eachRow((row, rowNumber) => {
    if (found !== null) return;
    if (String(row.getCell(column).value ?? "").includes(text)) {
      found = rowNumber;
    }
  });
  return found;
}

function rowValues(sheet: Worksheet, rowNumber: number): string[] {
  const row = sheet.getRow(rowNumber);
  const values: string[] = [];
  for (let column = 1; column <= row.cellCount; column += 1) {
    values.push(String(row.getCell(column).value ?? ""));
  }
  return values;
}

/** Data contoh menyerupai isi basis data, termasuk teks bertanda tipografi. */
function sampleData(): LaporanExport {
  return {
    role: "admin",
    roleLabel: "Staf Administrasi Prodi",
    generatedAt: GENERATED_AT,
    metrics: [
      { label: "Pengajuan surat bulan ini", value: 4 },
      { label: "Surat selesai (ber-TTD)", value: 12 },
      { label: "Total akun pengguna", value: 9 },
      { label: "Dokumen arsip tersimpan", value: 5 },
      { label: "Usulan judul belum diputuskan", value: 2 },
      { label: "Jadwal seminar mendatang", value: 1 },
    ],
    lettersByMonth: [
      { label: "Apr 26", value: 2 },
      { label: "Mei 26", value: 5 },
      { label: "Jun 26", value: 3 },
    ],
    thesisByStatus: [
      { label: "Menunggu Persetujuan Kaprodi", value: 2 },
      { label: "Disetujui", value: 3 },
      { label: "Ditolak", value: 1 },
    ],
    letters: [
      {
        createdAt: new Date("2026-09-01T01:10:00.000Z"),
        documentNumber: "TI/2026/007",
        studentName: "Andi Muhammad Fadil",
        studentNim: "2021510012",
        letterType: "active_student",
        purpose: "Pengajuan beasiswa semester ganjil",
        destination: null,
        status: "approved",
        approvedAt: new Date("2026-09-02T02:00:00.000Z"),
        signerName: "Dr. Andi, M.Kom.",
        qrToken: QR_TOKEN,
        documentUrl: "/api/surat/fadil/pdf",
      },
      {
        createdAt: new Date("2026-09-05T03:20:00.000Z"),
        documentNumber: null,
        studentName: "Nur Aisyah",
        studentNim: "2021510033",
        letterType: "research_introduction",
        purpose: "Permohonan data penelitian skripsi",
        destination: "Dinas Pendidikan Kota Parepare",
        status: "pending_kaprodi",
        approvedAt: null,
        signerName: null,
        qrToken: null,
        documentUrl: null,
      },
      {
        createdAt: new Date("2026-09-08T04:45:00.000Z"),
        documentNumber: null,
        studentName: "Rahmat Hidayat",
        studentNim: "2021510044",
        letterType: "internship_introduction",
        purpose:
          "\u201CMagang MBKM\u201D \u2014 batch 2\u2026 (kuota penuh) \u2705",
        destination: "PT Semen Tonasa",
        status: "rejected",
        approvedAt: null,
        signerName: null,
        qrToken: null,
        documentUrl: null,
      },
    ],
    theses: [
      {
        createdAt: new Date("2026-08-20T02:00:00.000Z"),
        studentName: "Nur Aisyah",
        studentNim: "2021510033",
        title:
          "Sistem Informasi Arsip Digital Berbasis Web pada Prodi Teknik Informatika",
        status: "approved",
        pembimbing1: "Budi, M.Kom.",
        pembimbing2: "Dr. Andi, M.Kom.",
        decidedAt: new Date("2026-08-25T02:00:00.000Z"),
      },
      {
        createdAt: new Date("2026-09-10T02:00:00.000Z"),
        studentName: "Rahmat Hidayat",
        studentNim: "2021510044",
        title: "Penerapan Machine Learning untuk Prediksi Kelulusan Mahasiswa",
        status: "pending",
        pembimbing1: null,
        pembimbing2: null,
        decidedAt: null,
      },
    ],
    archives: [
      {
        createdAt: new Date("2026-07-02T02:00:00.000Z"),
        category: "sk_rektor",
        title: "SK Rektor tentang Kalender Akademik 2025/2026",
        academicYear: "2025/2026",
        fileUrl: "https://example.com/sk-rektor.pdf",
      },
      {
        createdAt: new Date("2026-07-15T02:00:00.000Z"),
        category: "mou",
        title: "MoU Kerja Sama Praktik Industri",
        academicYear: null,
        fileUrl: "https://example.com/mou.pdf",
      },
    ],
    seminars: [
      {
        heldAt: new Date("2026-09-20T01:00:00.000Z"),
        seminarType: "proposal",
        studentName: "Nur Aisyah",
        studentNim: "2021510033",
        thesisTitle: "Sistem Informasi Arsip Digital Berbasis Web",
        location: "Ruang Seminar TI",
        upcoming: true,
      },
      {
        heldAt: new Date("2026-08-11T03:00:00.000Z"),
        seminarType: "final",
        studentName: "Andi Muhammad Fadil",
        studentNim: "2021510012",
        thesisTitle: "Sistem Informasi Manajemen Administrasi Prodi",
        location: "Aula Fakultas Teknik",
        upcoming: false,
      },
    ],
  };
}

async function checkXlsx(data: LaporanExport) {
  console.log("1) Ekspor Excel (.xlsx)");
  const bytes = await buildLaporanXlsx(data);
  const file = path.join(OUT_DIR, "laporan-simap-admin.xlsx");
  writeFileSync(file, bytes);
  check(
    "berkas terbentuk",
    bytes.byteLength > 5000,
    `${bytes.byteLength} byte -> ${path.relative(process.cwd(), file)}`
  );

  const workbook = new Workbook();
  await workbook.xlsx.load(toArrayBuffer(bytes));
  const names = workbook.worksheets.map((sheet) => sheet.name);
  check(
    "lima lembar laporan tersedia",
    names.join("|") ===
      "Ringkasan|Rekap Surat|Rekap Skripsi|Rekap Arsip|Jadwal Seminar",
    names.join("|")
  );

  const ringkasan = workbook.getWorksheet("Ringkasan");
  const surat = workbook.getWorksheet("Rekap Surat");
  const skripsi = workbook.getWorksheet("Rekap Skripsi");
  const arsip = workbook.getWorksheet("Rekap Arsip");
  const seminar = workbook.getWorksheet("Jadwal Seminar");

  if (!ringkasan || !surat || !skripsi || !arsip || !seminar) {
    check("lembar dapat dibuka kembali", false, "lembar tidak ditemukan");
    return;
  }

  const metricRow = findRow(ringkasan, "Surat selesai (ber-TTD)");
  const metricValue = metricRow
    ? ringkasan.getRow(metricRow).getCell(2).value
    : null;
  check(
    "ringkasan memuat metrik sebagai angka",
    typeof metricValue === "number" && metricValue === 12,
    `nilai ${String(metricValue)}`
  );

  const monthRow = findRow(ringkasan, "Mei 26");
  check(
    "ringkasan memuat rekap surat per bulan",
    monthRow !== null && ringkasan.getRow(monthRow).getCell(2).value === 5,
    monthRow === null ? "baris tidak ditemukan" : "nilai tidak sesuai"
  );

  const header = rowValues(surat, 1);
  check(
    "kepala tabel rekap surat lengkap",
    header.length === 12 && header[0] === "No" && header[11] === "Kode Validasi",
    header.join(" | ")
  );

  const fadilRow = findRow(surat, "Andi Muhammad Fadil", 4);
  const fadil = fadilRow ? rowValues(surat, fadilRow) : [];
  check(
    "baris surat memuat nomor, status, penandatangan, dan kode validasi",
    fadil[2] === "TI/2026/007" &&
      fadil[8] === "Selesai" &&
      fadil[9] === "Dr. Andi, M.Kom." &&
      fadil[11] === QR_TOKEN,
    fadil.join(" | ")
  );

  const rejectedRow = findRow(surat, "Rahmat Hidayat", 4);
  check(
    "surat berstatus ditolak tetap tercatat",
    rejectedRow !== null && rowValues(surat, rejectedRow)[8] === "Ditolak"
  );

  check("tabel rekap surat memiliki filter kolom", Boolean(surat.autoFilter));
  const view = surat.views[0];
  check("baris kepala tabel dibekukan", view?.state === "frozen", view?.state);

  const thesisRow = findRow(skripsi, "Sistem Informasi Arsip Digital", 5);
  const thesis = thesisRow ? rowValues(skripsi, thesisRow) : [];
  check(
    "rekap skripsi memuat status & pembimbing 1/2",
    thesis[5] === "Disetujui" &&
      thesis[6] === "Budi, M.Kom." &&
      thesis[7] === "Dr. Andi, M.Kom.",
    thesis.join(" | ")
  );

  const archiveRow = findRow(arsip, "SK Rektor", 4);
  const archive = archiveRow ? rowValues(arsip, archiveRow) : [];
  check(
    "rekap arsip memuat kategori, tahun akademik, dan tautan",
    archive[2] === "SK Rektor" &&
      archive[4] === "2025/2026" &&
      archive[5] === "https://example.com/sk-rektor.pdf",
    archive.join(" | ")
  );

  const seminarRow = findRow(seminar, "Ruang Seminar TI", 7);
  const seminarValues = seminarRow ? rowValues(seminar, seminarRow) : [];
  check(
    "jadwal seminar memuat jenis, ruang, dan keterangan waktu",
    seminarValues[2] === "Seminar Proposal" &&
      seminarValues[6] === "Ruang Seminar TI" &&
      seminarValues[7] === "Mendatang",
    seminarValues.join(" | ")
  );
}

async function checkPdf(data: LaporanExport) {
  console.log("\n2) Ekspor PDF");
  const bytes = await buildLaporanPdf(data);
  const file = path.join(OUT_DIR, "laporan-simap-admin.pdf");
  writeFileSync(file, bytes);
  check(
    "berkas terbentuk",
    bytes.byteLength > 4000,
    `${bytes.byteLength} byte -> ${path.relative(process.cwd(), file)}`
  );

  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPageCount();
  const text = printedText(doc);

  check(
    "kop universitas & prodi tercetak",
    text.includes("UNIVERSITAS MUHAMMADIYAH PAREPARE") &&
      text.includes("PROGRAM STUDI TEKNIK INFORMATIKA")
  );
  check(
    "judul dan pembuat laporan tercetak",
    text.includes(LAPORAN_TITLE) && text.includes("Staf Administrasi Prodi")
  );
  check(
    "ringkasan statistik memuat metrik",
    text.includes("Surat selesai (ber-TTD)") &&
      text.includes("Dokumen arsip tersimpan")
  );
  check(
    "rekap surat per bulan memuat label bulan",
    text.includes("Mei 26") && text.includes("Jun 26")
  );
  check(
    "status usulan skripsi memuat label status",
    text.includes("Menunggu Persetujuan Kaprodi")
  );
  check(
    "tabel rekap surat memuat baris data",
    text.includes("TI/2026/007") &&
      text.includes("Andi Muhammad Fadil") &&
      text.includes("Selesai")
  );
  check(
    "tabel rekap skripsi memuat pembimbing gabungan",
    text.includes("Budi, M.Kom. & Dr. Andi, M.Kom.")
  );
  check(
    "tabel rekap arsip memuat kategori & tahun akademik",
    text.includes("SK Rektor") && text.includes("2025/2026")
  );
  check(
    "tabel jadwal seminar memuat ruang & jenis",
    text.includes("Ruang Seminar TI") && text.includes("Seminar Proposal")
  );
  check(
    "teks bertanda tipografi disanitasi",
    text.includes('"Magang MBKM" - batch 2') && !text.includes("\u2705")
  );
  check(
    "kaki halaman memuat nomor halaman",
    text.includes(`Halaman 1 dari ${pages}`),
    `${pages} halaman`
  );
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log("== SIMAP TI UMPAR - pemeriksa ekspor laporan (Excel & PDF) ==\n");

  const data = sampleData();
  await checkXlsx(data);
  await checkPdf(data);

  const passed = checks - failures.length;
  console.log(`\n${passed}/${checks} pemeriksaan lulus`);
  if (failures.length > 0) {
    console.error(
      "Pemeriksaan gagal:\n" + failures.map((item) => ` - ${item}`).join("\n")
    );
    process.exit(1);
  }
  console.log(`Berkas contoh: ${path.relative(process.cwd(), OUT_DIR)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Gagal menjalankan pemeriksa ekspor laporan:", error);
    process.exit(1);
  });
