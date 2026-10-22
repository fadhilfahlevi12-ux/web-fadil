"use server";

import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { campusMembers, users, type Role } from "@/db/schema";
import { requireRole } from "@/lib/dal";
import {
  IDENTIFIER_LABEL,
  isValidIdentifier,
  normalizeIdentifier,
} from "@/lib/members";
import { findCampusMember } from "@/lib/queries/members";

export type CreateUserState = {
  error?: string;
  success?: string;
};

// Role yang boleh dibuat oleh admin lewat dashboard.
// Akun Admin sendiri hanya dibuat lewat `npm run db:seed`.
const STAFF_ROLES: Role[] = ["dosen", "kaprodi"];

export async function createStaffAccount(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  // Hanya admin yang boleh membuat akun dosen/kaprodi.
  await requireRole("admin");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const nidnInput = String(formData.get("nidn") ?? "").trim();

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }
  if (password.length < 6) {
    return { error: "Password minimal 6 karakter." };
  }
  if (!STAFF_ROLES.includes(role)) {
    return { error: "Role hanya boleh Dosen atau Kaprodi." };
  }

  // Dosen & Kaprodi wajib memakai NIDN yang sudah diimpor ke Data Akademik.
  if (!nidnInput) {
    return {
      error: `${IDENTIFIER_LABEL.dosen} wajib diisi untuk akun Dosen/Kaprodi.`,
    };
  }

  const nidn = normalizeIdentifier(nidnInput);
  if (!isValidIdentifier(nidn)) {
    return {
      error: `Format ${IDENTIFIER_LABEL.dosen} tidak valid (4–30 huruf/angka).`,
    };
  }

  const member = await findCampusMember("dosen", nidn);

  if (!member) {
    return {
      error: `${IDENTIFIER_LABEL.dosen} ${nidn} belum ada di Data Akademik. Impor data dosen terlebih dahulu melalui menu Data Akademik.`,
    };
  }
  if (member.claimedAt) {
    return {
      error: `${IDENTIFIER_LABEL.dosen} ${nidn} sudah dipakai akun lain.`,
    };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return { error: "Email sudah terdaftar." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let claimConflict = false;

  try {
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          // Nama akun diambil dari data akademik, bukan ketikan admin.
          name: member.name,
          role,
          nidn,
        })
        .returning({ id: users.id });

      // Klaim sekali pakai: NIDN tidak bisa dipakai dua akun.
      const claimed = await tx
        .update(campusMembers)
        .set({ claimedAt: new Date(), claimedByUserId: created.id })
        .where(
          and(
            eq(campusMembers.id, member.id),
            isNull(campusMembers.claimedAt)
          )
        )
        .returning({ id: campusMembers.id });

      if (claimed.length === 0) {
        claimConflict = true;
        throw new Error("NIDN sudah diklaim akun lain.");
      }
    });
  } catch {
    if (claimConflict) {
      return {
        error: `${IDENTIFIER_LABEL.dosen} ${nidn} baru saja dipakai akun lain.`,
      };
    }
    return { error: "Akun gagal dibuat. Coba lagi." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/data-akademik");

  return {
    success: `Akun ${role === "dosen" ? "Dosen" : "Kaprodi"} untuk ${
      member.name
    } berhasil dibuat.`,
  };
}
