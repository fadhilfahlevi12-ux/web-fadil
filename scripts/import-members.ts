import "dotenv/config";

import { readFileSync } from "node:fs";
import path from "node:path";

import { count, eq, isNotNull } from "drizzle-orm";

import { db } from "../db";
import { campusMembers, type MemberType } from "../db/schema";
import { IDENTIFIER_LABEL, parseBulkRows } from "../lib/members";
import {
  syncClaimedFromExistingUsers,
  syncMemberNamesToUsers,
  upsertCampusMembers,
} from "../lib/members-db";

/**
 * Impor data akademik (whitelist pendaftaran akun) dari file teks.
 *
 * Pemakaian:
 *   npm run db:import              # data/mahasiswa.txt + data/dosen.txt
 *   npm run db:import -- --dry-run # cek saja, tidak menulis ke database
 *   npx tsx scripts/import-members.ts <file-mahasiswa> <file-dosen>
 *
 * Format: satu baris satu orang, `NAMA;NIM` / `NAMA;NIDN`.
 * Pemisah boleh `;`, `|`, atau tab (salin dari Excel). Baris `#` = komentar.
 * Aman dijalankan berulang: NIM/NIDN yang sama akan memperbarui namanya.
 */

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const fileArgs = args.filter((arg) => !arg.startsWith("--"));

const SOURCES: { type: MemberType; label: string; file: string }[] = [
  {
    type: "mahasiswa",
    label: "Mahasiswa",
    file: fileArgs[0] ?? "data/mahasiswa.txt",
  },
  { type: "dosen", label: "Dosen", file: fileArgs[1] ?? "data/dosen.txt" },
];

function readSource(file: string): string | null {
  try {
    return readFileSync(path.resolve(process.cwd(), file), "utf8");
  } catch {
    return null;
  }
}

/**
 * Pecah satu baris CSV/TSV menjadi sel, menghormati tanda kutip
 * (mis. `1,"Dr. Andi, M.Kom.",0912123401`).
 */
function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === delimiter && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

/**
 * Ubah isi CSV/TSV (hasil export Excel/Sheets) menjadi teks `NAMA<TAB>NIM/NIDN`
 * agar bisa diproses `parseBulkRows`. Kolom terakhir dianggap NIM/NIDN; kolom
 * nomor urut (mis. `NO`) dan baris judul dibuang otomatis.
 */
function convertDelimited(raw: string, delimiter: string): string {
  return raw
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim()) return "";

      let cells = splitDelimitedLine(line, delimiter).map((cell) =>
        cell.trim()
      );

      // Buang kolom nomor urut di awal (mis. `1, Ahmad Fadil, 2201010001`).
      if (cells.length > 2 && /^\d{1,4}\.?$/.test(cells[0])) {
        cells = cells.slice(1);
      }
      if (cells.length < 2) return "";

      const identifier = cells[cells.length - 1];
      const name = cells
        .slice(0, -1)
        .filter((cell) => cell.length > 0)
        .join(", ");

      // Baris judul kolom (mis. `NO, NAMA, NIM`).
      if (/^(nim|nidn)$/i.test(identifier) || /^(nama|name)$/i.test(name)) {
        return "";
      }

      return `${name}\t${identifier}`;
    })
    .join("\n");
}

async function main() {
  console.log(
    `== Impor Data Akademik${DRY_RUN ? " (DRY RUN — tidak menulis)" : ""} ==\n`
  );

  const rows: { memberType: MemberType; name: string; identifier: string }[] =
    [];
  const errors: string[] = [];
  const missing: string[] = [];

  for (const source of SOURCES) {
    const fileContent = readSource(source.file);
    if (fileContent === null) {
      missing.push(`${source.label}: ${source.file}`);
      continue;
    }

    // CSV/TSV (hasil export Excel) atau teks bertab dikonversi dulu; teks
    // `NAMA;NIM` dipakai apa adanya.
    const tabular = /\.(csv|tsv)$/i.test(source.file) || fileContent.includes("\t");
    const raw = tabular
      ? convertDelimited(
          fileContent,
          /\.csv$/i.test(source.file) ? "," : "\t"
        )
      : fileContent;

    const parsed = parseBulkRows(raw, IDENTIFIER_LABEL[source.type]);
    rows.push(...parsed.rows.map((row) => ({ ...row, memberType: source.type })));
    errors.push(...parsed.errors.map((message) => `[${source.label}] ${message}`));

    console.log(
      `${source.label.padEnd(9)}: ${parsed.rows.length} baris valid  (${source.file})`
    );
  }

  for (const item of missing) {
    console.log(`dilewati : file tidak ditemukan — ${item}`);
  }

  if (errors.length > 0) {
    console.log(`\nBaris bermasalah (${errors.length}):`);
    for (const message of errors) console.log(`  - ${message}`);
  }

  if (rows.length === 0) {
    console.log("\nTidak ada baris valid untuk diimpor.");
    if (missing.length > 0) {
      console.log(
        "Buat file tersebut (lihat data/README.md) lalu jalankan ulang."
      );
    }
    process.exit(1);
  }

  // Hitung berapa yang baru vs pembaruan nama.
  const existing = await db
    .select({
      memberType: campusMembers.memberType,
      identifier: campusMembers.identifier,
    })
    .from(campusMembers);

  const existingKeys = new Set(
    existing.map((row) => `${row.memberType}:${row.identifier}`)
  );

  const uniqueKeys = new Set(rows.map((row) => `${row.memberType}:${row.identifier}`));
  const newCount = [...uniqueKeys].filter((key) => !existingKeys.has(key)).length;
  const updateCount = uniqueKeys.size - newCount;

  console.log(
    `\nRingkasan: ${uniqueKeys.size} baris unik → ${newCount} baru, ${updateCount} pembaruan nama`
  );

  if (DRY_RUN) {
    console.log("DRY RUN selesai. Tidak ada perubahan pada database.");
    return;
  }

  const saved = await upsertCampusMembers(rows);
  await syncClaimedFromExistingUsers();
  // Koreksi nama di data akademik ikut memperbarui nama akun terkait.
  await syncMemberNamesToUsers();

  const [totalRow] = await db
    .select({ value: count() })
    .from(campusMembers);
  const [claimedRow] = await db
    .select({ value: count() })
    .from(campusMembers)
    .where(isNotNull(campusMembers.claimedAt));
  const [mahasiswaRow] = await db
    .select({ value: count() })
    .from(campusMembers)
    .where(eq(campusMembers.memberType, "mahasiswa"));
  const [dosenRow] = await db
    .select({ value: count() })
    .from(campusMembers)
    .where(eq(campusMembers.memberType, "dosen"));

  console.log(`\nTersimpan: ${saved} baris.`);
  console.log(
    `Isi tabel sekarang: ${Number(totalRow.value)} baris ` +
      `(${Number(mahasiswaRow.value)} mahasiswa, ${Number(dosenRow.value)} dosen, ` +
      `${Number(claimedRow.value)} sudah terpakai akun)`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Gagal mengimpor:", error);
    process.exit(1);
  });
