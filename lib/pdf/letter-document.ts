import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { toBuffer as qrToBuffer } from "qrcode";

import { LETTER_TYPE_LABELS, type LetterType } from "@/db/schema";
import { formatDateLong } from "@/lib/format";
import { pdfSafeText, wrapText } from "@/lib/pdf/letter-text";

/**
 * Generator surat PDF ber-QR (PRD §3A & §4).
 *
 * Layout meniru surat resmi prodi: kop universitas, judul surat, nomor
 * dokumen, badan surat, tanda tangan elektronik Kaprodi, dan QR Code yang
 * mengarah ke halaman publik `/validasi/<qrToken>` untuk membuktikan
 * keaslian dokumen.
 *
 * Modul ini tidak memakai `server-only` agar dapat dijalankan langsung oleh
 * skrip pemeriksa (`npm run pdf:check`); hanya boleh dipanggil dari server.
 */

export type LetterPdfInput = {
  letterType: LetterType;
  documentNumber: string;
  qrToken: string;
  purpose: string;
  destination: string | null;
  approvedAt: Date | null;
  requester: { name: string; nim: string | null };
  signer: { name: string; nidn: string | null };
  /** URL absolut halaman validasi yang ditanam pada QR Code. */
  verificationUrl: string;
};

const PAGE_WIDTH = 595.28; // A4 portrait (pt)
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = MARGIN;

const BODY_SIZE = 11.5;
const LINE_GAP = 4.5;
const LABEL_WIDTH = 118;
const LABEL_INDENT = 18;

const COLOR_TEXT = rgb(0.09, 0.11, 0.15);
const COLOR_MUTED = rgb(0.35, 0.38, 0.43);
const COLOR_ACCENT = rgb(0.13, 0.32, 0.72);
const COLOR_RULE = rgb(0.75, 0.78, 0.82);

type PdfColor = ReturnType<typeof rgb>;
type Align = "left" | "center" | "right";

/**
 * Gambar QR Code (PNG) untuk URL validasi surat.
 * Dipakai generator PDF dan oleh skrip pemeriksa `npm run pdf:check`
 * yang mendekode ulang gambar ini untuk memastikan isinya tepat.
 */
export async function letterQrPng(verificationUrl: string): Promise<Uint8Array> {
  return qrToBuffer(verificationUrl, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 512,
    color: { dark: "#0f172aff", light: "#ffffffff" },
  });
}

/** Nama berkas unduhan, mis. `surat-ti-2026-001.pdf`. */
export function letterPdfFileName(documentNumber: string): string {
  const slug = pdfSafeText(documentNumber)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `surat-${slug || "prodi-ti"}.pdf`;
}

/** Kalimat penutup badan surat sesuai jenis surat. */
function letterStatements(letterType: LetterType): string[] {
  switch (letterType) {
    case "active_student":
      return [
        "Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
        "Atas perhatian dan kerja samanya kami ucapkan terima kasih.",
      ];
    case "research_introduction":
      return [
        "Sehubungan dengan hal tersebut, kami mengantarkan mahasiswa yang bersangkutan untuk melaksanakan penelitian dalam rangka penyusunan tugas akhir (skripsi) pada instansi/lembaga yang dituju.",
        "Demikian surat pengantar ini dibuat untuk dapat dipergunakan sebagaimana mestinya.",
        "Atas perhatian dan kerja samanya kami ucapkan terima kasih.",
      ];
    case "internship_introduction":
      return [
        "Sehubungan dengan hal tersebut, kami mengantarkan mahasiswa yang bersangkutan untuk melaksanakan Magang / Kerja Praktik (KP) pada instansi/lembaga yang dituju.",
        "Demikian surat pengantar ini dibuat untuk dapat dipergunakan sebagaimana mestinya.",
        "Atas perhatian dan kerja samanya kami ucapkan terima kasih.",
      ];
  }
}

/** Bangun berkas PDF surat lengkap dengan QR Code validasi. */
export async function buildLetterPdf(
  input: LetterPdfInput
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const body = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const approvedAt = input.approvedAt ?? new Date();
  const documentNumber = pdfSafeText(input.documentNumber);
  const letterTitle = pdfSafeText(
    LETTER_TYPE_LABELS[input.letterType]
  ).toUpperCase();

  doc.setTitle(`${letterTitle} - ${documentNumber}`);
  doc.setAuthor("SIMAP TI UMPAR");
  doc.setSubject("Surat resmi Program Studi Teknik Informatika UMPAR");
  doc.setCreator("SIMAP TI UMPAR");
  doc.setProducer("SIMAP TI UMPAR");
  doc.setCreationDate(approvedAt);
  doc.setModificationDate(approvedAt);

  let page: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function newPage() {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  /** Pastikan masih ada ruang `height` sebelum y turun melewati margin bawah. */
  function ensure(height: number) {
    if (y - height < BOTTOM) newPage();
  }

  /** Gambar satu baris teks dan kembalikan lebarnya. */
  function drawLine(
    text: string,
    font: PDFFont,
    size: number,
    align: Align,
    indent = 0,
    color: PdfColor = COLOR_TEXT
  ) {
    const safe = pdfSafeText(text);
    const width = font.widthOfTextAtSize(safe, size);
    let x = MARGIN + indent;
    if (align === "center") x = MARGIN + (CONTENT_WIDTH - width) / 2;
    if (align === "right") x = MARGIN + CONTENT_WIDTH - width;

    page.drawText(safe, { x, y: y - size, size, font, color });
    return width;
  }

  type ParagraphOptions = {
    font?: PDFFont;
    size?: number;
    align?: Align;
    indent?: number;
    color?: PdfColor;
    lineGap?: number;
    gapBefore?: number;
    gapAfter?: number;
  };

  /** Tulis paragraf dengan pembungkusan baris otomatis + pindah halaman. */
  function paragraph(text: string, options: ParagraphOptions = {}) {
    const font = options.font ?? body;
    const size = options.size ?? BODY_SIZE;
    const indent = options.indent ?? 0;
    const lineGap = options.lineGap ?? LINE_GAP;
    const color = options.color ?? COLOR_TEXT;
    const maxWidth = CONTENT_WIDTH - indent;

    const lines = wrapText(
      text,
      (value) => font.widthOfTextAtSize(value, size),
      maxWidth
    );

    if (options.gapBefore) y -= options.gapBefore;

    for (const line of lines) {
      ensure(size + lineGap);
      y -= size;
      drawLine(line, font, size, options.align ?? "left", indent, color);
      y -= lineGap;
    }

    if (options.gapAfter) y -= options.gapAfter;
  }

  /** Baris data berlabel (Nama, NIM, …) dengan nilai yang dapat membungkus. */
  function detailRow(label: string, value: string) {
    const valueWidth = CONTENT_WIDTH - LABEL_INDENT - LABEL_WIDTH;
    const lines = wrapText(
      pdfSafeText(value),
      (text) => body.widthOfTextAtSize(text, BODY_SIZE),
      valueWidth
    );
    const rows = lines.length > 0 ? lines : ["-"];

    rows.forEach((line, index) => {
      ensure(BODY_SIZE + LINE_GAP);
      if (index > 0) y -= BODY_SIZE + 2;

      if (index === 0) {
        page.drawText(pdfSafeText(label), {
          x: MARGIN + LABEL_INDENT,
          y: y - BODY_SIZE,
          size: BODY_SIZE,
          font: body,
          color: COLOR_TEXT,
        });
        page.drawText(":", {
          x: MARGIN + LABEL_INDENT + LABEL_WIDTH - 8,
          y: y - BODY_SIZE,
          size: BODY_SIZE,
          font: body,
          color: COLOR_TEXT,
        });
      }

      page.drawText(line, {
        x: MARGIN + LABEL_INDENT + LABEL_WIDTH,
        y: y - BODY_SIZE,
        size: BODY_SIZE,
        font: body,
        color: COLOR_TEXT,
      });
      y -= BODY_SIZE + LINE_GAP;
    });
  }

  // ---------- Kop surat ----------
  paragraph("UNIVERSITAS MUHAMMADIYAH PAREPARE", {
    font: bold,
    size: 13.5,
    align: "center",
    lineGap: 1,
  });
  paragraph("FAKULTAS TEKNIK", {
    font: bold,
    size: 11.5,
    align: "center",
    lineGap: 1,
  });
  paragraph("PROGRAM STUDI TEKNIK INFORMATIKA", {
    font: bold,
    size: 11.5,
    align: "center",
    lineGap: 1,
  });

  y -= 6;
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
  y -= 22;

  // ---------- Judul & nomor dokumen ----------
  ensure(70);
  y -= 12.5;
  const titleWidth = drawLine(letterTitle, bold, 12.5, "center");
  page.drawLine({
    start: { x: MARGIN + (CONTENT_WIDTH - titleWidth) / 2, y: y - 15.5 },
    end: { x: MARGIN + (CONTENT_WIDTH + titleWidth) / 2, y: y - 15.5 },
    thickness: 0.8,
    color: COLOR_TEXT,
  });
  y -= 20.5;

  paragraph(`Nomor: ${documentNumber}`, {
    size: 10.5,
    align: "center",
    gapAfter: 16,
  });

  // ---------- Badan surat ----------
  paragraph(
    "Yang bertanda tangan di bawah ini, Ketua Program Studi Teknik Informatika, Fakultas Teknik, Universitas Muhammadiyah Parepare, dengan ini menerangkan bahwa:",
    { gapAfter: 8 }
  );

  detailRow("Nama", input.requester.name);
  detailRow("NIM", input.requester.nim ?? "-");
  detailRow("Program Studi", "Teknik Informatika");
  detailRow("Keperluan", input.purpose);
  if (input.destination) {
    detailRow("Instansi Tujuan", input.destination);
  }

  y -= 10;

  for (const statement of letterStatements(input.letterType)) {
    paragraph(statement, { gapAfter: 8 });
  }

  // ---------- Tanda tangan elektronik ----------
  const signerName = pdfSafeText(input.signer.name);
  const signerNidn = pdfSafeText(input.signer.nidn ?? "");

  ensure(190);
  y -= 6;
  paragraph(`Parepare, ${formatDateLong(approvedAt)}`, {
    align: "right",
    lineGap: 2,
  });
  paragraph("Ketua Program Studi Teknik Informatika,", {
    align: "right",
    gapAfter: 52,
  });
  paragraph("(ditandatangani secara elektronik)", {
    align: "right",
    font: italic,
    size: 9,
    color: COLOR_MUTED,
    gapAfter: 4,
  });

  y -= 12;
  const nameWidth = drawLine(signerName, bold, BODY_SIZE, "right");
  page.drawLine({
    start: { x: MARGIN + CONTENT_WIDTH - nameWidth, y: y - BODY_SIZE - 2.5 },
    end: { x: MARGIN + CONTENT_WIDTH, y: y - BODY_SIZE - 2.5 },
    thickness: 0.7,
    color: COLOR_TEXT,
  });
  y -= BODY_SIZE + LINE_GAP;

  if (signerNidn) {
    paragraph(`NIDN: ${signerNidn}`, {
      align: "right",
      size: 10,
      color: COLOR_MUTED,
      lineGap: 2,
    });
  }

  // ---------- QR Code validasi (pojok kiri bawah) ----------
  const qrImage = await doc.embedPng(await letterQrPng(input.verificationUrl));
  const qrSize = 84;
  const qrX = MARGIN;
  const qrY = BOTTOM + 4;

  page.drawRectangle({
    x: qrX - 5,
    y: qrY - 5,
    width: qrSize + 10,
    height: qrSize + 10,
    borderColor: COLOR_RULE,
    borderWidth: 0.7,
  });
  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

  const captionX = qrX + qrSize + 14;
  const captionSize = 7.5;
  const urlLines = wrapText(
    pdfSafeText(input.verificationUrl),
    (text) => sans.widthOfTextAtSize(text, captionSize),
    PAGE_WIDTH - MARGIN - captionX
  ).slice(0, 2);

  let captionY = qrY + qrSize - 8;
  page.drawText("Pindai QR Code untuk memverifikasi keaslian surat ini.", {
    x: captionX,
    y: captionY,
    size: 8.5,
    font: sansBold,
    color: COLOR_TEXT,
  });

  for (const line of urlLines) {
    captionY -= 11;
    page.drawText(line, {
      x: captionX,
      y: captionY,
      size: captionSize,
      font: sans,
      color: COLOR_ACCENT,
    });
  }

  captionY -= 11;
  page.drawText(`Kode validasi: ${pdfSafeText(input.qrToken)}`, {
    x: captionX,
    y: captionY,
    size: captionSize,
    font: sans,
    color: COLOR_MUTED,
  });
  captionY -= 11;
  page.drawText("Data surat ditampilkan langsung dari basis data SIMAP.", {
    x: captionX,
    y: captionY,
    size: captionSize,
    font: sans,
    color: COLOR_MUTED,
  });

  return doc.save();
}

