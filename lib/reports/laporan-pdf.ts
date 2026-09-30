import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import {
  ARCHIVE_CATEGORY_LABELS,
  LETTER_STATUS_LABELS,
  LETTER_TYPE_LABELS,
  SEMINAR_TYPE_LABELS,
  THESIS_STATUS_LABELS,
} from "@/db/schema";
import { formatDateLong, formatDateTime } from "@/lib/format";
import { pdfSafeText } from "@/lib/pdf/letter-text";
import {
  LAPORAN_HEADER,
  LAPORAN_TITLE,
  type LaporanExport,
} from "@/lib/reports/laporan-types";

/**
 * Ekspor laporan ke berkas PDF (PRD §3D) — A4 lanskap agar tabel rekap muat
 * lega. Berisi ringkasan statistik, grafik tabular (surat per bulan & status
 * skripsi), serta rekap surat, skripsi, arsip, dan jadwal seminar.
 *
 * Modul bebas `server-only` & koneksi database agar dapat diperiksa oleh
 * `npm run laporan:check`.
 */

const PAGE_WIDTH = 841.89; // A4 landscape
const PAGE_HEIGHT = 595.28;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = 46;
const ROW_HEIGHT = 14;
const CELL_SIZE = 7.5;
const MAX_ROWS_PER_TABLE = 40;

const COLOR_TEXT = rgb(0.09, 0.11, 0.15);
const COLOR_MUTED = rgb(0.35, 0.38, 0.43);
const COLOR_SECTION = rgb(0.11, 0.31, 0.65);
const COLOR_RULE = rgb(0.75, 0.78, 0.82);
const COLOR_HEADER_BG = rgb(0.88, 0.91, 0.96);
const COLOR_STRIPE = rgb(0.96, 0.97, 0.98);

type PdfColor = ReturnType<typeof rgb>;
type Column = { header: string; width: number; align?: "left" | "right" };

/** Bangun berkas PDF laporan lengkap. */
export async function buildLaporanPdf(
  data: LaporanExport
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  doc.setTitle(LAPORAN_TITLE);
  doc.setAuthor("SIMAP TI UMPAR");
  doc.setSubject("Rekap administrasi Program Studi Teknik Informatika UMPAR");
  doc.setCreator("SIMAP TI UMPAR");
  doc.setProducer("SIMAP TI UMPAR");
  doc.setCreationDate(data.generatedAt);
  doc.setModificationDate(data.generatedAt);

  let page: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function newPage() {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function ensure(height: number) {
    if (y - height < BOTTOM) newPage();
  }

  /** Potong teks agar muat pada lebar kolom (diakhiri ".." bila terpotong). */
  function truncate(
    text: string,
    font: PDFFont,
    size: number,
    maxWidth: number
  ): string {
    let value = pdfSafeText(text);
    if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
    while (value.length > 1 && font.widthOfTextAtSize(`${value}..`, size) > maxWidth) {
      value = value.slice(0, -1);
    }
    return `${value}..`;
  }

  /** Tulis teks satu baris pada posisi y saat ini lalu turunkan kursor. */
  function line(
    text: string,
    font: PDFFont,
    size: number,
    options: {
      align?: "left" | "center" | "right";
      color?: PdfColor;
      gapAfter?: number;
    } = {}
  ) {
    const safe = pdfSafeText(text);
    const width = font.widthOfTextAtSize(safe, size);
    let x = MARGIN;
    if (options.align === "center") x = MARGIN + (CONTENT_WIDTH - width) / 2;
    if (options.align === "right") x = MARGIN + CONTENT_WIDTH - width;

    y -= size;
    page.drawText(safe, {
      x,
      y,
      size,
      font,
      color: options.color ?? COLOR_TEXT,
    });
    y -= options.gapAfter ?? 2;
  }

  /** Judul bagian dengan garis pemisah. */
  function sectionTitle(title: string) {
    ensure(44);
    y -= 18;
    y -= 10;
    page.drawText(pdfSafeText(title), {
      x: MARGIN,
      y,
      size: 10,
      font: bold,
      color: COLOR_SECTION,
    });
    y -= 4;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.8,
      color: COLOR_RULE,
    });
    y -= 10;
  }

  /** Baris kepala tabel (diulang setiap halaman). */
  function tableHeader(columns: Column[], totalWidth: number) {
    ensure(ROW_HEIGHT + 10);
    const top = y;
    const bottom = top - ROW_HEIGHT;
    page.drawRectangle({
      x: MARGIN,
      y: bottom,
      width: totalWidth,
      height: ROW_HEIGHT,
      color: COLOR_HEADER_BG,
    });
    page.drawLine({
      start: { x: MARGIN, y: top },
      end: { x: MARGIN + totalWidth, y: top },
      thickness: 0.6,
      color: COLOR_RULE,
    });

    let x = MARGIN;
    for (const column of columns) {
      page.drawText(truncate(column.header, bold, CELL_SIZE, column.width - 6), {
        x: x + 3,
        y: bottom + 4,
        size: CELL_SIZE,
        font: bold,
        color: COLOR_TEXT,
      });
      x += column.width;
    }
    y = bottom;
  }

  /** Tabel lengkap dengan pagination otomatis dan kepala yang berulang. */
  function table(
    columns: Column[],
    rows: string[][],
    options: { maxRows?: number } = {}
  ) {
    const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
    const visible = rows.slice(0, options.maxRows ?? MAX_ROWS_PER_TABLE);

    if (visible.length === 0) {
      ensure(ROW_HEIGHT + 6);
      y -= CELL_SIZE + 2;
      page.drawText("Belum ada data.", {
        x: MARGIN + 2,
        y,
        size: CELL_SIZE,
        font: italic,
        color: COLOR_MUTED,
      });
      y -= 10;
      return;
    }

    tableHeader(columns, totalWidth);

    visible.forEach((values, index) => {
      if (y - ROW_HEIGHT < BOTTOM) {
        newPage();
        tableHeader(columns, totalWidth);
      }

      const bottom = y - ROW_HEIGHT;
      if (index % 2 === 1) {
        page.drawRectangle({
          x: MARGIN,
          y: bottom,
          width: totalWidth,
          height: ROW_HEIGHT,
          color: COLOR_STRIPE,
        });
      }

      let x = MARGIN;
      columns.forEach((column, columnIndex) => {
        const value = truncate(
          values[columnIndex] ?? "",
          regular,
          CELL_SIZE,
          column.width - 6
        );
        const width = regular.widthOfTextAtSize(value, CELL_SIZE);
        page.drawText(value, {
          x: column.align === "right" ? x + column.width - 3 - width : x + 3,
          y: bottom + 4,
          size: CELL_SIZE,
          font: regular,
          color: COLOR_TEXT,
        });
        x += column.width;
      });

      page.drawLine({
        start: { x: MARGIN, y: bottom },
        end: { x: MARGIN + totalWidth, y: bottom },
        thickness: 0.3,
        color: COLOR_RULE,
      });
      y = bottom;
    });

    if (rows.length > visible.length) {
      ensure(16);
      y -= 8;
      page.drawText(
        pdfSafeText(
          `... dan ${rows.length - visible.length} baris lainnya - gunakan ekspor Excel untuk daftar lengkap.`
        ),
        { x: MARGIN + 2, y, size: 7, font: italic, color: COLOR_MUTED }
      );
      y -= 8;
    }

    y -= 6;
  }

  /** Daftar metrik dua kolom: label di kiri, angka rata kanan. */
  function metricGrid(items: { label: string; value: number }[]) {
    const columnWidth = CONTENT_WIDTH / 2;

    for (let index = 0; index < items.length; index += 2) {
      ensure(16);
      const rowTop = y;

      items.slice(index, index + 2).forEach((item, columnIndex) => {
        const x = MARGIN + columnIndex * columnWidth;
        page.drawText(truncate(item.label, regular, 8.5, columnWidth - 56), {
          x,
          y: rowTop - 9,
          size: 8.5,
          font: regular,
          color: COLOR_TEXT,
        });
        const value = String(item.value);
        const valueWidth = bold.widthOfTextAtSize(value, 8.5);
        page.drawText(value, {
          x: x + columnWidth - 32 - valueWidth,
          y: rowTop - 9,
          size: 8.5,
          font: bold,
          color: COLOR_TEXT,
        });
      });

      page.drawLine({
        start: { x: MARGIN, y: rowTop - 13 },
        end: { x: PAGE_WIDTH - MARGIN, y: rowTop - 13 },
        thickness: 0.25,
        color: COLOR_RULE,
      });
      y = rowTop - 16;
    }
  }

  // ---------- Kop laporan ----------
  line(LAPORAN_TITLE, bold, 15, { align: "center", gapAfter: 2 });
  line(LAPORAN_HEADER[0], regular, 9.5, {
    align: "center",
    color: COLOR_MUTED,
    gapAfter: 1,
  });
  line(LAPORAN_HEADER[1], regular, 9.5, {
    align: "center",
    color: COLOR_MUTED,
    gapAfter: 3,
  });
  line(
    `Dibuat oleh: ${data.roleLabel} - Dicetak: ${formatDateTime(data.generatedAt)}`,
    italic,
    8.5,
    { align: "center", color: COLOR_MUTED, gapAfter: 5 }
  );
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1.1,
    color: COLOR_TEXT,
  });
  y -= 2.5;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: COLOR_TEXT,
  });
  y -= 12;

  // ---------- Ringkasan statistik & grafik tabular ----------
  sectionTitle("Ringkasan Statistik");
  metricGrid(data.metrics);

  sectionTitle("Pengajuan Surat per Bulan");
  table(
    [
      { header: "Bulan", width: 260 },
      { header: "Jumlah Pengajuan", width: 90, align: "right" },
    ],
    data.lettersByMonth.map((point) => [point.label, String(point.value)])
  );

  sectionTitle("Status Usulan Judul Skripsi");
  table(
    [
      { header: "Status", width: 260 },
      { header: "Jumlah", width: 90, align: "right" },
    ],
    data.thesisByStatus.map((point) => [point.label, String(point.value)])
  );

  // ---------- Rekap pengajuan surat ----------
  sectionTitle("Rekap Pengajuan Surat Mahasiswa");
  table(
    [
      { header: "No", width: 26, align: "right" },
      { header: "Tanggal", width: 88 },
      { header: "Nomor Dokumen", width: 86 },
      { header: "Pemohon", width: 140 },
      { header: "NIM", width: 66 },
      { header: "Jenis Surat", width: 130 },
      { header: "Keperluan", width: 150 },
      { header: "Status", width: 75 },
    ],
    data.letters.map((row, index) => [
      String(index + 1),
      formatDateLong(row.createdAt),
      row.documentNumber ?? "-",
      row.studentName,
      row.studentNim ?? "-",
      LETTER_TYPE_LABELS[row.letterType],
      row.purpose,
      LETTER_STATUS_LABELS[row.status],
    ])
  );

  // ---------- Rekap usulan judul skripsi ----------
  sectionTitle("Rekap Usulan Judul Skripsi & Pembimbing");
  table(
    [
      { header: "No", width: 26, align: "right" },
      { header: "Tanggal", width: 88 },
      { header: "Pemohon", width: 150 },
      { header: "Judul Usulan", width: 273 },
      { header: "Status", width: 90 },
      { header: "Pembimbing 1 / 2", width: 134 },
    ],
    data.theses.map((row, index) => [
      String(index + 1),
      formatDateLong(row.createdAt),
      row.studentName,
      row.title,
      THESIS_STATUS_LABELS[row.status],
      [row.pembimbing1, row.pembimbing2].filter(Boolean).join(" & ") || "-",
    ])
  );

  // ---------- Rekap arsip digital ----------
  sectionTitle("Rekap Arsip Digital Prodi");
  table(
    [
      { header: "No", width: 26, align: "right" },
      { header: "Tanggal Unggah", width: 88 },
      { header: "Kategori", width: 120 },
      { header: "Judul Dokumen", width: 400 },
      { header: "Tahun Akademik", width: 74 },
    ],
    data.archives.map((row, index) => [
      String(index + 1),
      formatDateLong(row.createdAt),
      ARCHIVE_CATEGORY_LABELS[row.category],
      row.title,
      row.academicYear ?? "-",
    ])
  );

  // ---------- Jadwal seminar ----------
  sectionTitle("Jadwal Seminar & Ujian");
  table(
    [
      { header: "No", width: 24, align: "right" },
      { header: "Waktu", width: 100 },
      { header: "Jenis", width: 95 },
      { header: "Pemohon", width: 130 },
      { header: "NIM", width: 56 },
      { header: "Judul Skripsi", width: 260 },
      { header: "Ruang", width: 96 },
    ],
    data.seminars.map((row, index) => [
      String(index + 1),
      formatDateTime(row.heldAt),
      SEMINAR_TYPE_LABELS[row.seminarType],
      row.studentName ?? "-",
      row.studentNim ?? "-",
      row.thesisTitle ?? "-",
      row.location ?? "-",
    ])
  );

  // ---------- Kaki halaman pada semua halaman ----------
  const pages = doc.getPages();
  pages.forEach((current, index) => {
    current.drawText(
      pdfSafeText(`SIMAP TI UMPAR - ${LAPORAN_TITLE}`),
      { x: MARGIN, y: 24, size: 7.5, font: regular, color: COLOR_MUTED }
    );
    const pageLabel = `Halaman ${index + 1} dari ${pages.length}`;
    const pageLabelWidth = regular.widthOfTextAtSize(pageLabel, 7.5);
    current.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN - pageLabelWidth,
      y: 24,
      size: 7.5,
      font: regular,
      color: COLOR_MUTED,
    });
    current.drawLine({
      start: { x: MARGIN, y: 36 },
      end: { x: PAGE_WIDTH - MARGIN, y: 36 },
      thickness: 0.4,
      color: COLOR_RULE,
    });
  });

  return doc.save();
}
