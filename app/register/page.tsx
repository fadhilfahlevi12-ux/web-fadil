"use client";

import { useActionState } from "react";
import Link from "next/link";

import { register } from "@/lib/actions/auth";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(register, {
    error: null,
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">
          Daftar Akun Mahasiswa
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          Buat akun mahasiswa SIMAP TI UMPAR. Cukup masukkan NIM, email, dan
          password — nama akun diambil otomatis dari data akademik prodi.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="nim"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              NIM
            </label>
            <input
              id="nim"
              name="nim"
              required
              minLength={4}
              maxLength={30}
              autoComplete="username"
              autoFocus
              placeholder="Contoh: 2201010001"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              Nama akun mengikuti data akademik prodi. Bila NIM belum terdaftar,
              hubungi staf administrasi.
            </p>
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? "Memproses..." : "Daftar"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:underline"
          >
            Masuk
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-slate-400">
          Akun Dosen, Kaprodi, dan Admin dibuat khusus oleh admin/pengembang.
        </p>
      </div>
    </main>
  );
}
