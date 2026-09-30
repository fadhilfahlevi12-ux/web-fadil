"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { signIn, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

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
  // Publik hanya boleh mendaftar sebagai mahasiswa.
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nim = String(formData.get("nim") ?? "").trim() || null;

  if (!name || !email || !password) {
    return { error: "Nama, email, dan password wajib diisi." };
  }
  if (password.length < 6) {
    return { error: "Password minimal 6 karakter." };
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
    role: "mahasiswa",
    nim,
  });

  await signIn("credentials", { email, password, redirectTo: "/mahasiswa" });

  return { error: null };
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
