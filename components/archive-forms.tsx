"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  ARCHIVE_CATEGORY_LABELS,
  type ArchiveCategory,
} from "@/db/schema";
import {
  createArchiveDocument,
  deleteArchiveDocument,
  type ArchiveActionState,
} from "@/lib/actions/archives";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

const initState: ArchiveActionState = {};

function Message({ state }: { state: ArchiveActionState }) {
  if (!state.error && !state.success) return null;
  return (
    <p
      className={
        state.error
          ? "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
          : "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
      }
    >
      {state.error ?? state.success}
    </p>
  );
}

/** Form admin: simpan dokumen arsip (unggah PDF dan/atau URL). */
export function UploadArchiveForm({
  storageEnabled,
  maxSizeMb,
}: {
  storageEnabled: boolean;
  maxSizeMb: number;
}) {
  const [state, formAction, pending] = useActionState(
    createArchiveDocument,
    initState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="category"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Kategori Dokumen
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              Pilih kategori…
            </option>
            {(Object.keys(ARCHIVE_CATEGORY_LABELS) as ArchiveCategory[]).map(
              (category) => (
                <option key={category} value={category}>
                  {ARCHIVE_CATEGORY_LABELS[category]}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="academicYear"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Tahun Akademik
          </label>
          <input
            id="academicYear"
            name="academicYear"
            placeholder="2025/2026"
            pattern="\d{4}/\d{4}"
            title="Format YYYY/YYYY, contoh 2025/2026"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="title"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Judul Dokumen
          </label>
          <input
            id="title"
            name="title"
            required
            minLength={3}
            maxLength={255}
            className={inputClass}
            placeholder="Contoh: SK Rektor tentang Kalender Akademik 2025/2026"
          />
        </div>

        {storageEnabled ? (
          <div className="sm:col-span-2">
            <label
              htmlFor="file"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Berkas PDF
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700"
            />
            <p className="mt-1 text-xs text-slate-500">
              Format PDF, maksimal {maxSizeMb} MB. Berkas diunggah ke Supabase
              Storage dan tautannya tersimpan otomatis.
            </p>
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <label
            htmlFor="fileUrl"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            {storageEnabled ? "Atau tautan dokumen" : "Tautan Dokumen"}
          </label>
          <input
            id="fileUrl"
            name="fileUrl"
            type="url"
            maxLength={1000}
            className={inputClass}
            placeholder="https://drive.google.com/…"
          />
          <p className="mt-1 text-xs text-slate-500">
            {storageEnabled
              ? "Kosongkan bila memakai unggahan berkas di atas."
              : "Upload berkas belum aktif (kredensial Supabase Storage belum diisi). Tempel tautan dokumen yang dapat diakses publik."}
          </p>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="description"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Deskripsi
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={1000}
            className={inputClass}
            placeholder="Keterangan singkat mengenai dokumen (opsional)…"
          />
        </div>
      </div>

      <Message state={state} />

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan Dokumen"}
        </button>
      </div>
    </form>
  );
}

/** Tombol admin: hapus dokumen arsip. */
export function DeleteArchiveForm({ documentId }: { documentId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteArchiveDocument,
    initState
  );
  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="documentId" value={documentId} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          {pending ? "Menghapus..." : "Hapus"}
        </button>
      </form>
      <Message state={state} />
    </div>
  );
}
