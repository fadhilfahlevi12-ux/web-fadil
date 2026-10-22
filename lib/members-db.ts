import { sql } from "drizzle-orm";

import { db } from "@/db";
import { campusMembers, type MemberType } from "@/db/schema";

/**
 * Operasi basis data untuk data akademik (`campus_members`).
 *
 * Dipakai bersama oleh server action admin (`lib/actions/members.ts`) dan skrip
 * impor (`scripts/import-members.ts`) agar aturan simpan & sinkronisasi sama.
 */

export type CampusMemberInput = {
  memberType: MemberType;
  name: string;
  identifier: string;
  createdById?: string | null;
};

/**
 * Simpan/perbarui banyak data akademik sekaligus.
 * Kunci unik: (jenis, NIM/NIDN) — baris dengan NIM/NIDN yang sudah ada akan
 * diperbarui namanya, bukan diduplikasi. Duplikat di dalam satu kiriman dibuang.
 *
 * @returns jumlah baris unik yang diproses
 */
export async function upsertCampusMembers(rows: CampusMemberInput[]) {
  if (rows.length === 0) return 0;

  const unique = new Map<string, CampusMemberInput>();
  for (const row of rows) {
    const key = `${row.memberType}:${row.identifier}`;
    if (!unique.has(key)) unique.set(key, row);
  }

  await db
    .insert(campusMembers)
    .values([...unique.values()])
    .onConflictDoUpdate({
      target: [campusMembers.memberType, campusMembers.identifier],
      set: { name: sql`excluded.name`, updatedAt: new Date() },
    });

  return unique.size;
}

/**
 * Samakan nama akun yang sudah terklaim dengan nama terbaru di data akademik.
 *
 * Berguna saat admin memperbaiki salah ketik nama: nama akun (yang tidak bisa
 * diubah sendiri oleh pemilik akun) ikut terkoreksi pada impor berikutnya.
 * Hanya menyentuh akun yang terhubung ke data akademik (`claimed_by_user_id`).
 */
export async function syncMemberNamesToUsers() {
  await db.execute(sql`
    UPDATE users AS u
    SET name = cm.name, updated_at = now()
    FROM campus_members AS cm
    WHERE cm.claimed_by_user_id = u.id
      AND u.name <> cm.name
  `);
}

/**
 * Tandai data akademik yang NIM/NIDN-nya sudah dipakai akun lama (akun yang
 * dibuat sebelum fitur whitelist ini ada).
 *
 * Tanpa langkah ini, NIM/NIDN yang sudah punya akun akan tampil "belum punya
 * akun" di daftar sehingga bisa dipakai orang lain untuk mendaftar ulang.
 * Perbandingan memakai normalisasi yang sama dengan `normalizeIdentifier`
 * (hanya huruf/angka, huruf besar).
 */
export async function syncClaimedFromExistingUsers() {
  await db.execute(sql`
    UPDATE campus_members AS cm
    SET claimed_at = now(), claimed_by_user_id = u.id
    FROM users AS u
    WHERE cm.claimed_at IS NULL
      AND cm.member_type = 'mahasiswa'
      AND u.role = 'mahasiswa'
      AND u.nim IS NOT NULL
      AND upper(regexp_replace(u.nim, '[^a-zA-Z0-9]', '', 'g')) = cm.identifier
  `);

  await db.execute(sql`
    UPDATE campus_members AS cm
    SET claimed_at = now(), claimed_by_user_id = u.id
    FROM users AS u
    WHERE cm.claimed_at IS NULL
      AND cm.member_type = 'dosen'
      AND u.role IN ('dosen', 'kaprodi')
      AND u.nidn IS NOT NULL
      AND upper(regexp_replace(u.nidn, '[^a-zA-Z0-9]', '', 'g')) = cm.identifier
  `);
}
