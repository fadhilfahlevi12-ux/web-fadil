"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  MEMBER_TYPE_LABELS,
  campusMembers,
  memberTypeEnum,
  type MemberType,
} from "@/db/schema";
import { requireRole } from "@/lib/dal";
import {
  IDENTIFIER_LABEL,
  isValidIdentifier,
  normalizeIdentifier,
  parseBulkRows,
} from "@/lib/members";
import {
  syncClaimedFromExistingUsers,
  syncMemberNamesToUsers,
  upsertCampusMembers,
} from "@/lib/members-db";

export type MemberActionState = {
  error?: string;
  success?: string;
};

const DATA_AKADEMIK_PATH = "/admin/data-akademik";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readMemberType(value: FormDataEntryValue | null): MemberType | null {
  const raw = String(value ?? "").trim();
  return (memberTypeEnum.enumValues as readonly string[]).includes(raw)
    ? (raw as MemberType)
    : null;
}

/** Admin menambah satu data akademik (NAMA + NIM/NIDN). */
export async function createCampusMember(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const admin = await requireRole("admin");

  const memberType = readMemberType(formData.get("memberType"));
  const name = String(formData.get("name") ?? "").trim();
  const identifier = String(formData.get("identifier") ?? "").trim();

  if (!memberType) {
    return { error: "Jenis data tidak valid." };
  }
  if (name.length < 2) {
    return { error: "Nama minimal 2 karakter." };
  }
  if (name.length > 255) {
    return { error: "Nama maksimal 255 karakter." };
  }

  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (!isValidIdentifier(normalizedIdentifier)) {
    return {
      error: `${IDENTIFIER_LABEL[memberType]} tidak valid (4–30 huruf/angka).`,
    };
  }

  await upsertCampusMembers([
    {
      memberType,
      name,
      identifier: normalizedIdentifier,
      createdById: admin.id,
    },
  ]);

  // Jaga agar NIM/NIDN yang sudah punya akun langsung berstatus terpakai.
  await syncClaimedFromExistingUsers();

  // Nama akun mengikuti data akademik (termasuk koreksi salah ketik).
  await syncMemberNamesToUsers();

  revalidatePath(DATA_AKADEMIK_PATH);

  return {
    success: `${MEMBER_TYPE_LABELS[memberType]} ${name} (${normalizedIdentifier}) tersimpan.`,
  };
}

/** Admin mengimpor banyak baris sekaligus untuk mahasiswa dan/atau dosen. */
export async function bulkImportMembers(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const admin = await requireRole("admin");

  const mahasiswaRaw = String(formData.get("mahasiswaRows") ?? "");
  const dosenRaw = String(formData.get("dosenRows") ?? "");

  if (!mahasiswaRaw.trim() && !dosenRaw.trim()) {
    return { error: "Tempelkan data terlebih dahulu (minimal satu baris)." };
  }

  const mahasiswa = parseBulkRows(mahasiswaRaw, IDENTIFIER_LABEL.mahasiswa);
  const dosen = parseBulkRows(dosenRaw, IDENTIFIER_LABEL.dosen);

  const rows = [
    ...mahasiswa.rows.map((row) => ({
      ...row,
      memberType: "mahasiswa" as const,
    })),
    ...dosen.rows.map((row) => ({ ...row, memberType: "dosen" as const })),
  ];

  const errors = [
    ...mahasiswa.errors.map((message) => `[Mahasiswa] ${message}`),
    ...dosen.errors.map((message) => `[Dosen] ${message}`),
  ];

  if (rows.length === 0) {
    return {
      error: ["Tidak ada baris valid untuk diimpor.", ...errors]
        .join(" ")
        .trim(),
    };
  }

  // Buang duplikat di dalam satu kiriman (jenis + identitas).
  const saved = await upsertCampusMembers(
    rows.map((row) => ({
      memberType: row.memberType,
      name: row.name,
      identifier: row.identifier,
      createdById: admin.id,
    }))
  );

  // Jaga agar NIM/NIDN yang sudah punya akun langsung berstatus terpakai.
  await syncClaimedFromExistingUsers();

  // Nama akun mengikuti data akademik (termasuk koreksi salah ketik).
  await syncMemberNamesToUsers();

  revalidatePath(DATA_AKADEMIK_PATH);

  const skipped = errors.length
    ? ` ${errors.length} baris dilewati — ${errors.slice(0, 3).join(" ")}${
        errors.length > 3 ? " …" : ""
      }`
    : "";

  return {
    success: `${saved} baris tersimpan (${mahasiswa.rows.length} mahasiswa, ${dosen.rows.length} dosen). Data dengan NIM/NIDN yang sama diperbarui namanya.${skipped}`,
  };
}

/** Admin menghapus data akademik yang belum dipakai membuat akun. */
export async function deleteCampusMember(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  await requireRole("admin");

  const memberId = String(formData.get("memberId") ?? "").trim();
  if (!UUID_PATTERN.test(memberId)) {
    return { error: "Data tidak ditemukan." };
  }

  const [row] = await db
    .select({ claimedAt: campusMembers.claimedAt })
    .from(campusMembers)
    .where(eq(campusMembers.id, memberId))
    .limit(1);

  if (!row) {
    return { error: "Data tidak ditemukan." };
  }
  if (row.claimedAt) {
    return {
      error:
        "Data ini sudah dipakai untuk membuat akun sehingga tidak dapat dihapus.",
    };
  }

  await db.delete(campusMembers).where(eq(campusMembers.id, memberId));

  revalidatePath(DATA_AKADEMIK_PATH);

  return { success: "Data akademik dihapus." };
}
