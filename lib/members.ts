import type { MemberType } from "@/db/schema";

/**
 * Utilitas data akademik.
 *
 * Dipakai bersama oleh pendaftaran (mahasiswa), pembuatan akun staf
 * (dosen/kaprodi), server action admin, dan skrip impor agar aturan
 * normalisasi NIM/NIDN & format impor konsisten.
 * File ini sengaja tidak memakai `server-only` supaya bisa diuji terpisah.
 */

/** Normalisasi NIM/NIDN: hanya huruf & angka, diubah ke huruf besar. */
export function normalizeIdentifier(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/** NIM/NIDN dianggap valid bila 4–30 karakter huruf/angka. */
export function isValidIdentifier(value: string): boolean {
  const normalized = normalizeIdentifier(value);
  return normalized.length >= 4 && normalized.length <= 30;
}

export type ParsedMemberRow = {
  name: string;
  identifier: string;
};

export type BulkParseResult = {
  rows: ParsedMemberRow[];
  errors: string[];
};

// Pemisah yang didukung pada impor massal. Koma sengaja tidak dipakai karena
// nama bergelar sering mengandung koma (mis. "Dr. Andi, M.Kom.").
const DELIMITERS = [";", "|", "\t"] as const;

/**
 * Parse teks impor massal — satu baris satu orang.
 *
 * Format yang diterima:
 *   `Ahmad Fadil;2201010001`
 *   `Ahmad Fadil | 2201010001`
 *   `Ahmad Fadil<TAB>2201010001`
 *   `Ahmad Fadil 2201010001` (dipisah spasi terakhir sebelum deretan angka)
 *
 * Baris kosong dilewati; baris bermasalah dicatat pada `errors`.
 */
export function parseBulkRows(
  raw: string,
  identifierLabel = "NIM"
): BulkParseResult {
  const rows: ParsedMemberRow[] = [];
  const errors: string[] = [];

  raw.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    // Baris kosong & baris komentar (#) dilewati.
    if (!trimmed || trimmed.startsWith("#")) return;

    const lineNumber = index + 1;
    let name = "";
    let identifier = "";
    const delimiter = DELIMITERS.find((item) => trimmed.includes(item));

    if (delimiter) {
      const parts = trimmed.split(delimiter);
      identifier = (parts.pop() ?? "").trim();
      name = parts.join(delimiter).trim();
    } else {
      const match = trimmed.match(/^(.*\S)\s+([0-9][0-9.\-\s]*)$/);
      if (match) {
        name = match[1].trim();
        identifier = match[2].trim();
      } else {
        errors.push(
          `Baris ${lineNumber}: format tidak dikenali ("${trimmed}"). Gunakan NAMA;${identifierLabel}.`
        );
        return;
      }
    }

    // Baris judul kolom (mis. "NAMA;NIM" atau "NO	NAMA	NIDN") dilewati.
    if (/^(NIM|NIDN)$/.test(normalizeIdentifier(identifier))) return;

    if (name.length < 2) {
      errors.push(`Baris ${lineNumber}: nama minimal 2 karakter.`);
      return;
    }
    if (name.length > 255) {
      errors.push(`Baris ${lineNumber}: nama maksimal 255 karakter.`);
      return;
    }
    if (!isValidIdentifier(identifier)) {
      errors.push(
        `Baris ${lineNumber}: ${identifierLabel} "${identifier}" tidak valid (4–30 huruf/angka).`
      );
      return;
    }

    rows.push({ name, identifier: normalizeIdentifier(identifier) });
  });

  return { rows, errors };
}

/** Label kolom identitas untuk pesan kesalahan. */
export const IDENTIFIER_LABEL: Record<MemberType, string> = {
  mahasiswa: "NIM",
  dosen: "NIDN",
};
