"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  SEMINAR_TYPE_LABELS,
  type SeminarType,
} from "@/db/schema";
import {
  deleteSeminar,
  publishSeminar,
  type SeminarActionState,
} from "@/lib/actions/seminars";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

const initState: SeminarActionState = {};

function Message({ state }: { state: SeminarActionState }) {
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

/** Form admin: publikasi jadwal seminar/ujian. */
export function PublishSeminarForm({
  thesisOptions,
}: {
  thesisOptions: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    publishSeminar,
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
            htmlFor="seminarType"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Jenis Seminar
          </label>
          <select
            id="seminarType"
            name="seminarType"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              Pilih jenis…
            </option>
            {(Object.keys(SEMINAR_TYPE_LABELS) as SeminarType[]).map((type) => (
              <option key={type} value={type}>
                {SEMINAR_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="heldAt"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Tanggal &amp; Waktu
          </label>
          <input
            id="heldAt"
            name="heldAt"
            type="datetime-local"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="location"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Ruang
          </label>
          <input
            id="location"
            name="location"
            maxLength={150}
            className={inputClass}
            placeholder="Contoh: Lab. Komputer 2"
          />
        </div>

        <div>
          <label
            htmlFor="thesisSubmissionId"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Mahasiswa Terkait
          </label>
          <select
            id="thesisSubmissionId"
            name="thesisSubmissionId"
            defaultValue=""
            className={inputClass}
          >
            <option value="">— Tidak terkait pengajuan tertentu —</option>
            {thesisOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="notes"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Dosen Penguji / Keterangan
          </label>
          <input
            id="notes"
            name="notes"
            maxLength={500}
            className={inputClass}
            placeholder="Contoh: Penguji 1 — Budi, M.Kom.; Penguji 2 — Sari, M.T."
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
          {pending ? "Menyimpan..." : "Publikasikan Jadwal"}
        </button>
      </div>
    </form>
  );
}

/** Tombol admin: hapus jadwal seminar. */
export function DeleteSeminarForm({ seminarId }: { seminarId: string }) {
  const [state, formAction, pending] = useActionState(deleteSeminar, initState);
  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="seminarId" value={seminarId} />
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
