import { Workbook, type Borders, type Fill, type Font, type Worksheet } from "exceljs";

import {
  ARCHIVE_CATEGORY_LABELS,
  LETTER_STATUS_LABELS,
  LETTER_TYPE_LABELS,
  SEMINAR_TYPE_LABELS,
  THESIS_STATUS_LABELS,
} from "@/db/schema";
import { formatDateTime } from "@/lib/format";
import {
  LAPORAN_HEADER,
  LAPORAN_TITLE,
  type LaporanExport,
} from "@/lib/reports/laporan-types";

/**
 * Ekspor laporan ke berkas Excel `.xlsx` multi-sheet (PRD §3D).
 *
 * Berkas berisi lembar Ringkasan (statistik + grafik tabular), Rekap Surat,
 * Rekap Skripsi, Rekap Arsip, dan Jadwal Seminar. Modul ini bebas
 * `server-only` & koneksi database agar dapat diperiksa oleh
 * `npm run laporan:check`.
 */

type CellValue = string | number | null;

const HEADER_FILL: Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1D4ED8" },
};
const HEADER_FONT: Partial<Font> = {
  bold: true,
  size: 11,
  color: { argb: "FFFFFFFF" },
};
const TITLE_FONT: Partial<Font> = {
  bold: true,
  size: 14,
  color: { argb: "FF0F172A" },
};
const SUBTITLE_FONT: Partial<Font> = { size: 10, color: { argb: "FF475569" } };
const SECTION_FONT: Partial<Font> = {
  bold: true,
  size: 12,
  color: { argb: "FF1E293B" },
};
const NOTE_FONT: Partial<Font> = {
  italic: true,
  color: { argb: "FF64748B" },
};
const THIN_BORDER: Partial<Borders> = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

/** Judul bagian (mis. "Statistik") di dalam sebuah lembar. */
function addSection(sheet: Worksheet, title: string) {
  sheet.addRow([]);
  const row = sheet.addRow([title]);
  row.font = SECTION_FONT;
}

/**
 * Tulis tabel: baris kepala berwarna + seluruh baris data.
 * Lebar kolom dipakai apa adanya agar tabel pada satu lembar tetap konsisten.
 */
function addTable(
  sheet: Worksheet,
  headers: string[],
  widths: number[],
  rows: CellValue[][],
  options: { freezeHeader?: boolean } = {}
): void {
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  const headerRow = sheet.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = THIN_BORDER;
  });

  if (rows.length === 0) {
    sheet.addRow(["Belum ada data."]).font = NOTE_FONT;
    return;
  }

  for (const values of rows) {
    const row = sheet.addRow(values);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "top", wrapText: true };
    });
  }

  if (options.freezeHeader) {
    sheet.views = [{ state: "frozen", ySplit: headerRow.number }];
    sheet.autoFilter = {
      from: { row: headerRow.number, column: 1 },
      to: { row: sheet.rowCount, column: headers.length },
    };
  }
}

/** Lembar Ringkasan: kop, keterangan pencetak, lalu tiga tabel pendek. */
function buildRingkasanSheet(workbook: Workbook, data: LaporanExport) {
  const sheet = workbook.addWorksheet("Ringkasan");

  sheet.getColumn(1).width = 46;
  sheet.getColumn(2).width = 24;

  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").value = LAPORAN_TITLE;
  sheet.getCell("A1").font = TITLE_FONT;

  sheet.mergeCells("A2:B2");
  sheet.getCell("A2").value = LAPORAN_HEADER.join(" — ");
  sheet.getCell("A2").font = SUBTITLE_FONT;

  sheet.mergeCells("A3:B3");
  sheet.getCell("A3").value = `Dibuat oleh: ${data.roleLabel} · Dicetak: ${formatDateTime(data.generatedAt)}`;
  sheet.getCell("A3").font = SUBTITLE_FONT;

  addSection(sheet, "Statistik");
  addTable(
    sheet,
    ["Metrik", "Nilai"],
    [46, 24],
    data.metrics.map((metric) => [metric.label, metric.value])
  );

  addSection(sheet, "Pengajuan Surat per Bulan");
  addTable(
    sheet,
    ["Bulan", "Jumlah Pengajuan"],
    [46, 24],
    data.lettersByMonth.map((point) => [point.label, point.value])
  );

  addSection(sheet, "Status Usulan Judul Skripsi");
  addTable(
    sheet,
    ["Status", "Jumlah"],
    [46, 24],
    data.thesisByStatus.map((point) => [point.label, point.value])
  );
}

/** Lembar Rekap Surat: seluruh pengajuan beserta nomor dokumen & kode validasi. */
function buildSuratSheet(workbook: Workbook, data: LaporanExport) {
  const sheet = workbook.addWorksheet("Rekap Surat");
  const headers = [
    "No",
    "Tanggal Pengajuan",
    "Nomor Dokumen",
    "Pemohon",
    "NIM",
    "Jenis Surat",
    "Keperluan",
    "Instansi Tujuan",
    "Status",
    "Disetujui Oleh",
    "Tanggal TTD",
    "Kode Validasi",
  ];

  addTable(
    sheet,
    headers,
    [5, 20, 16, 24, 14, 26, 40, 26, 20, 20, 20, 34],
    data.letters.map((row, index) => [
      index + 1,
      formatDateTime(row.createdAt),
      row.documentNumber ?? "-",
      row.studentName,
      row.studentNim ?? "-",
      LETTER_TYPE_LABELS[row.letterType],
      row.purpose,
      row.destination ?? "-",
      LETTER_STATUS_LABELS[row.status],
      row.signerName ?? "-",
      row.approvedAt ? formatDateTime(row.approvedAt) : "-",
      row.qrToken ?? "-",
    ]),
    { freezeHeader: true }
  );
}

/** Lembar Rekap Skripsi: usulan judul, keputusan, dan pembimbing. */
function buildThesisSheet(workbook: Workbook, data: LaporanExport) {
  const sheet = workbook.addWorksheet("Rekap Skripsi");

  addTable(
    sheet,
    [
      "No",
      "Tanggal Usulan",
      "Pemohon",
      "NIM",
      "Judul Usulan",
      "Status",
      "Pembimbing 1",
      "Pembimbing 2",
      "Tanggal Keputusan",
    ],
    [5, 20, 24, 14, 50, 26, 24, 24, 20],
    data.theses.map((row, index) => [
      index + 1,
      formatDateTime(row.createdAt),
      row.studentName,
      row.studentNim ?? "-",
      row.title,
      THESIS_STATUS_LABELS[row.status],
      row.pembimbing1 ?? "-",
      row.pembimbing2 ?? "-",
      row.decidedAt ? formatDateTime(row.decidedAt) : "-",
    ]),
    { freezeHeader: true }
  );
}

/** Lembar Rekap Arsip: bank data dokumen prodi. */
function buildArchiveSheet(workbook: Workbook, data: LaporanExport) {
  const sheet = workbook.addWorksheet("Rekap Arsip");

  addTable(
    sheet,
    ["No", "Tanggal Unggah", "Kategori", "Judul Dokumen", "Tahun Akademik", "Tautan Berkas"],
    [5, 20, 22, 50, 16, 50],
    data.archives.map((row, index) => [
      index + 1,
      formatDateTime(row.createdAt),
      ARCHIVE_CATEGORY_LABELS[row.category],
      row.title,
      row.academicYear ?? "-",
      row.fileUrl,
    ]),
    { freezeHeader: true }
  );
}

/** Lembar Jadwal Seminar: proposal, hasil, dan tutup/ujian. */
function buildSeminarSheet(workbook: Workbook, data: LaporanExport) {
  const sheet = workbook.addWorksheet("Jadwal Seminar");

  addTable(
    sheet,
    [
      "No",
      "Waktu Pelaksanaan",
      "Jenis",
      "Pemohon",
      "NIM",
      "Judul Skripsi",
      "Ruang",
      "Keterangan",
    ],
    [5, 20, 20, 24, 14, 44, 20, 16],
    data.seminars.map((row, index) => [
      index + 1,
      formatDateTime(row.heldAt),
      SEMINAR_TYPE_LABELS[row.seminarType],
      row.studentName ?? "-",
      row.studentNim ?? "-",
      row.thesisTitle ?? "-",
      row.location ?? "-",
      row.upcoming ? "Mendatang" : "Sudah berlalu",
    ]),
    { freezeHeader: true }
  );
}

/** Bangun berkas Excel `.xlsx` berisi seluruh rekap laporan. */
export async function buildLaporanXlsx(
  data: LaporanExport
): Promise<Uint8Array> {
  const workbook = new Workbook();
  workbook.creator = "SIMAP TI UMPAR";
  workbook.created = data.generatedAt;
  workbook.modified = data.generatedAt;

  buildRingkasanSheet(workbook, data);
  buildSuratSheet(workbook, data);
  buildThesisSheet(workbook, data);
  buildArchiveSheet(workbook, data);
  buildSeminarSheet(workbook, data);

  const buffer: unknown = await workbook.xlsx.writeBuffer();
  return buffer instanceof Uint8Array
    ? new Uint8Array(buffer)
    : new Uint8Array(buffer as ArrayBuffer);
}
