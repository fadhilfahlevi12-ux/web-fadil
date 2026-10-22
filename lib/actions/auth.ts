"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";

import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { campusMembers, users } from "@/db/schema";
import {
  isValidIdentifier,
  normalizeIdentifier,
} from "@/lib/members";
import { findCampusMember } from "@/lib/queries/members";

export type AuthState = { error: string | null };

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  const [existing] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!existing) {
    return { error: "Email atau password salah." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: `/${existing.role}`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email atau password salah." };
    }
    throw error;
  }

  return { error: null };
}

export async function register(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  // Publik hanya boleh mendaftar sebagai mahasiswa. Cukup NIM, email, dan
  // password: nama akun diambil dari data akademik prodi (diimpor admin di menu
  // Data Akademik), sehingga NIM asal-asalan tidak dapat membuat akun.
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nimInput = String(formData.get("nim") ?? "").trim();

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }
  if (!nimInput) {
    return { error: "NIM wajib diisi." };
  }
  if (password.length < 6) {
    return { error: "Password minimal 6 karakter." };
  }

  const nim = normalizeIdentifier(nimInput);
  if (!isValidIdentifier(nim)) {
    return { error: "Format NIM tidak valid (4–30 huruf/angka)." };
  }

  const member = await findCampusMember("mahasiswa", nim);

  if (!member) {
    return {
      error:
        "NIM tidak ditemukan pada data akademik prodi. Hubungi staf administrasi untuk didaftarkan.",
    };
  }
  if (member.claimedAt) {
    return {
      error:
        "NIM ini sudah dipakai untuk mendaftar. Silakan masuk, atau hubungi staf administrasi bila lupa password.",
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
          // Nama akun SELALU diambil dari data akademik (bukan ketikan user).
          name: member.name,
          role: "mahasiswa",
          nim,
        })
        .returning({ id: users.id });

      // Klaim sekali pakai: hanya berhasil bila belum ada yang memakai NIM ini.
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
        throw new Error("NIM sudah diklaim pengguna lain.");
      }
    });
  } catch {
    if (claimConflict) {
      return {
        error:
          "NIM ini baru saja didaftarkan pengguna lain. Hubungi staf administrasi bila ini keliru.",
      };
    }
    return {
      error: "Pendaftaran gagal. Coba lagi atau hubungi staf administrasi.",
    };
  }

  await signIn("credentials", { email, password, redirectTo: "/mahasiswa" });

  return { error: null };
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
