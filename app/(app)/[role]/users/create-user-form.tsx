"use client";

import { useActionState } from "react";

import { createStaffAccount } from "@/lib/actions/users";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createStaffAccount, {});

  return (
    <form action={formAction} className="mt-2 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Nama Lengkap
          </label>
          <input id="name" name="name" required className={inputClass} />
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
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="role"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Role
          </label>
          <select id="role" name="role" defaultValue="dosen" className={inputClass}>
            <option value="dosen">Dosen</option>
            <option value="kaprodi">Kaprodi</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="nidn"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            NIDN
          </label>
          <input
            id="nidn"
            name="nidn"
            placeholder="Contoh: 0912345678"
            className={inputClass}
          />
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Memproses..." : "Buat Akun"}
      </button>
    </form>
  );
}
