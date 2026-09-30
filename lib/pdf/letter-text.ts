/**
 * Utilitas teks untuk generator PDF surat (PRD §4).
 *
 * Font standar PDF (Times/Helvetica) memakai encoding WinAnsi, sehingga
 * karakter di luar rentang tersebut membuat pdf-lib melempar error saat
 * `drawText`. Karena itu setiap teks yang berasal dari basis data (nama,
 * keperluan, instansi tujuan) wajib melewati `pdfSafeText()` lebih dahulu.
 *
 * Modul ini sengaja bebas dari dependensi pdf-lib agar mudah diuji
 * langsung dengan tsx (lihat `npm run pdf:check`).
 */

/** Karakter tipografi yang lazim dipakai pengguna, dipetakan ke padanan ASCII. */
const CHAR_REPLACEMENTS: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": "'",
  "\u201B": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u201F": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2015": "-",
  "\u2212": "-",
  "\u2026": "...",
  "\u2022": "-",
  "\u00B7": "-",
  "\u2264": "<=",
  "\u2265": ">=",
  "\u00D7": "x",
  "\u00F7": "/",
  "\u00A0": " ",
  "\u200B": "",
  "\u200C": "",
  "\u200D": "",
  "\uFEFF": "",
};

/**
 * Ubah teks menjadi bentuk yang aman digambar dengan font standar PDF:
 * petakan tanda baca tipografi, buang karakter kontrol, dan ganti karakter
 * di luar jangkauan WinAnsi dengan "?".
 */
export function pdfSafeText(value: string | null | undefined): string {
  if (!value) return "";

  let output = "";
  for (const char of value.normalize("NFC")) {
    const replacement = CHAR_REPLACEMENTS[char];
    if (replacement !== undefined) {
      output += replacement;
      continue;
    }

    const code = char.codePointAt(0) ?? 0;
    const isPrintableAscii = code >= 0x20 && code <= 0x7e;
    // 0xa0–0xff sesuai dengan glyf WinAnsi/Latin-1 (mis. é, ü).
    const isLatin1 = code >= 0xa0 && code <= 0xff;

    if (isPrintableAscii || isLatin1) {
      output += char;
      continue;
    }
    if (code === 0x0a || code === 0x0d || code === 0x09) {
      output += " ";
      continue;
    }
    output += "?";
  }

  return output.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Pecah teks menjadi baris-baris yang muat pada `maxWidth` sesuai hasil
 * `measure` (biasanya font.widthOfTextAtSize). Kata yang lebih panjang dari
 * kolom dipotong per karakter agar tidak melebar keluar halaman.
 */
export function wrapText(
  text: string,
  measure: (value: string) => number,
  maxWidth: number
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const lines: string[] = [];
  let current = "";

  for (const word of normalized.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;

    if (measure(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    if (measure(word) <= maxWidth) {
      current = word;
      continue;
    }

    let chunk = "";
    for (const char of word) {
      if (chunk && measure(chunk + char) > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    current = chunk;
  }

  if (current) lines.push(current);
  return lines;
}
