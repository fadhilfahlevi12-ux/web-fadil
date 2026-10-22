import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { campusMembers, type MemberType } from "@/db/schema";
import { normalizeIdentifier } from "@/lib/members";

/**
 * Cari data akademik resmi berdasarkan jenis (mahasiswa/dosen) dan NIM/NIDN.
 * Dipakai pendaftaran mandiri dan pembuatan akun staf untuk memastikan hanya
 * orang yang terdaftar di prodi yang bisa memiliki akun.
 */
export async function findCampusMember(
  memberType: MemberType,
  identifier: string
) {
  const normalized = normalizeIdentifier(identifier);

  const [row] = await db
    .select()
    .from(campusMembers)
    .where(
      and(
        eq(campusMembers.memberType, memberType),
        eq(campusMembers.identifier, normalized)
      )
    )
    .limit(1);

  return row ?? null;
}
