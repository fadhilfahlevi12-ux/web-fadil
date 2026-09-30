import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import jsQR from "jsqr";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { PNG } from "pngjs";

import { LETTER_TYPE_LABELS, type LetterType } from "../db/schema";
import {
  buildLetterPdf,
  letterPdfFileName,
  letterQrPng,
  type LetterPdfInput,
} from "../lib/pdf/letter-document";
import { pdfSafeText, wrapText } from "../lib/pdf/letter-text";
import { printedText } from "./lib/pdf-inspect";

/**
 * Pemeriksa generator surat PDF ber-QR (PRD §3A & §4).
 * Jalankan dengan: npm run pdf:check
 *
 * Yang diperiksa:
 * 1. `pdfSafeText`/`wrapText` menangani teks tipografi dan baris panjang.
 * 2. PDF ketiga jenis surat dapat dibangun lalu dibaca ulang pdf-lib.
 * 3. Nomor dokumen, judul, dan data pemohon benar-benar tercetak.
 * 4. QR Code yang ditanamkan memuat URL validasi (didekode ulang dengan jsQR).
 */

const OUT_DIR = path.join(process.cwd(), "tmp", "pdf-check");
const VERIFICATION_URL = "http://localhost:3000/validasi/9f1c4b7a2d6e4f0a8b3c5d7e9f1a2b3c";

const LETTER_TYPES: LetterType[] = [
  "active_student",
  "research_introduction",
  "internship_introduction",
];

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

/** Data contoh sengaja memuat karakter tipografi & emoji untuk menguji sanitasi. */
function sampleInput(letterType: LetterType): LetterPdfInput {
  return {
    letterType,
    documentNumber: "TI/2026/001",
    qrToken: "9f1c4b7a2d6e4f0a8b3c5d7e9f1a2b3c",
    purpose: "“Pengajuan beasiswa” — semester ganjil… (laporan 100% selesai) ✅",
    destination:
      letterType === "active_student"
        ? null
        : "Dinas Pendidikan Kota Parepare",
    approvedAt: new Date("2026-09-17T03:15:00.000Z"),
    requester: { name: "Andi Muhammad Fadil", nim: "2021510012" },
    signer: { name: "Dr. Andi, M.Kom.", nidn: "0912123401" },
    verificationUrl: VERIFICATION_URL,
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log("== SIMAP TI UMPAR - pemeriksa surat PDF ber-QR ==\n");

  console.log("1) Utilitas teks");
  check(
    "pdfSafeText memetakan tanda baca tipografi",
    pdfSafeText("\u201CA\u201D \u2014 B\u2026") === '"A" - B...',
    pdfSafeText("\u201CA\u201D \u2014 B\u2026")
  );
  check(
    "pdfSafeText membuang karakter di luar WinAnsi",
    pdfSafeText("selesai \u2705") === "selesai ?",
    pdfSafeText("selesai \u2705")
  );
  check(
    "pdfSafeText merapikan spasi berlebih",
    pdfSafeText("  Nama   Lengkap  ") === "Nama Lengkap",
    pdfSafeText("  Nama   Lengkap  ")
  );

  const measure = (value: string) => value.length;
  const wrapped = wrapText("satu dua tiga empat", measure, 10);
  check(
    "wrapText memecah paragraf sesuai lebar kolom",
    wrapped.join("|") === "satu dua|tiga empat",
    wrapped.join("|")
  );
  const hardWrap = wrapText("abcdefghijkl", measure, 5);
  check(
    "wrapText memotong kata yang lebih panjang dari kolom",
    hardWrap.join("|") === "abcde|fghij|kl",
    hardWrap.join("|")
  );

  console.log("\n2) Generator PDF surat");
  for (const letterType of LETTER_TYPES) {
    const input = sampleInput(letterType);
    const bytes = await buildLetterPdf(input);
    const fileName = letterPdfFileName(input.documentNumber);
    const filePath = path.join(OUT_DIR, letterType + "-" + fileName);
    writeFileSync(filePath, bytes);

    const doc = await PDFDocument.load(bytes);
    const text = printedText(doc);
    const imageCount = doc.context
      .enumerateIndirectObjects()
      .filter(
        ([, object]) =>
          object instanceof PDFRawStream &&
          object.dict.get(PDFName.of("Subtype"))?.toString() === "/Image"
      ).length;

    check(`${letterType}: PDF dapat dibaca ulang pdf-lib`, doc.getPageCount() >= 1);
    check(
      `${letterType}: nomor dokumen tercetak`,
      text.includes(input.documentNumber)
    );
    check(
      `${letterType}: judul surat tercetak`,
      text.includes(LETTER_TYPE_LABELS[letterType].toUpperCase())
    );
    check(
      `${letterType}: nama pemohon & NIM tercetak`,
      text.includes("Andi Muhammad Fadil") && text.includes("2021510012")
    );
    check(
      `${letterType}: tanda tangan elektronik tercetak`,
      text.includes("ditandatangani secara elektronik") &&
        text.includes("0912123401")
    );
    check(
      `${letterType}: keperluan bersih dari karakter tak didukung`,
      text.includes('"Pengajuan beasiswa" - semester ganjil...'),
      "teks tipografi tidak tersanitasi"
    );
    check(`${letterType}: gambar QR tertanam`, imageCount === 1, `${imageCount} gambar`);
    check(
      `${letterType}: berkas contoh tersimpan`,
      bytes.byteLength > 3000,
      `${bytes.byteLength} byte -> ${path.relative(process.cwd(), filePath)}`
    );
  }

  console.log("\n3) Isi QR Code pada surat");
  const qrPng = await letterQrPng(VERIFICATION_URL);
  const png = PNG.sync.read(Buffer.from(qrPng));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  check("QR Code dapat didekode (jsQR)", decoded !== null, `ukuran ${png.width}x${png.height}`);
  check(
    "QR Code memuat URL halaman validasi",
    decoded?.data === VERIFICATION_URL,
    decoded?.data
  );

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
    console.error("Gagal menjalankan pemeriksa PDF surat:", error);
    process.exit(1);
  });
