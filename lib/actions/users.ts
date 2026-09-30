"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { users, type Role } from "@/db/schema";
import { requireRole } from "@/lib/dal";

export type CreateUserState = {
  error?: string;
  success?: string;
};

// Role yang boleh dibuat oleh admin lewat dashboard.
const STAFF_ROLES: Role[] = ["dosen", "kaprodi"];

export async function createStaffAccount(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  // Hanya admin yang boleh membuat akun dosen/kaprodi.
  await requireRole("admin");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const nidn = String(formData.get("nidn") ?? "").trim() || null;

  if (!name || !email || !password) {
    return { error: "Nama, email, dan password wajib diisi." };
  }
  if (password.length < 6) {
    return { error: "Password minimal 6 karakter." };
  }
  if (!STAFF_ROLES.includes(role)) {
    return { error: "Role hanya boleh Dosen atau Kaprodi." };
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

  await db.insert(users).values({
    email,
    passwordHash,
    name,
    role,
    nidn,
  });

  revalidatePath("/admin/users");

  return {
    success: `Akun ${role === "dosen" ? "Dosen" : "Kaprodi"} untuk ${name} berhasil dibuat.`,
  };
}
