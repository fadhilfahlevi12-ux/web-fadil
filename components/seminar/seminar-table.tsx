"use client";

import { Fragment, useActionState, useState } from "react";

import { SEMINAR_TYPE_LABELS, type SeminarType } from "@/db/schema";
import { updateSeminar, type SeminarActionState } from "@/lib/actions/seminars";
import { DeleteSeminarForm } from "@/components/seminar-forms";
import { SeminarTypeBadge, SeminarWhenBadge } from "./seminar-badge";

/**
 * Tabel jadwal seminar untuk admin dengan penyuntingan langsung (PRD §3B).
 * Baris yang sedang disunting menampilkan formulir penuh di bawahnya sehingga
 * admin tidak perlu menghapus lalu mempublikasikan ulang.
 */

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

export type SeminarTableRow = {
  id: string;
  seminarType: SeminarType;
  heldAtLabel: string;
  heldAtValue: string;
  studentName: string | null;
  studentNim: string | null;
  thesisTitle: string | null;
  location: string | null;
  notes: string | null;
  upcoming: boolean;
  thesisSubmissionId: string | null;
};

type ThesisOption = { id: string; label: string };

const initState: SeminarActionState = {};

function Message({ state }: { state: SeminarActionState }) {
  if (!state.error && !state.success) return null;
  return (
    <p
      className={
        state.error
          ? "rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"
          : "rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
      }
    >
      {state.error ?? state.success}
    </p>
  );
}

/** Formulir sunting jadwal; nilainya sudah terisi dari baris tabel. */
function EditSeminarFields({
  row,
  thesisOptions,
  onClose,
}: {
  row: SeminarTableRow;
  thesisOptions: ThesisOption[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateSeminar, initState);

  const linkedThesisMissing =
    row.thesisSubmissionId !== null &&
    !thesisOptions.some((option) => option.id === row.thesisSubmissionId);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="seminarId" value={row.id} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label
            htmlFor={`seminarType-${row.id}`}
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Jenis Seminar
          </label>
          <select
            id={`seminarType-${row.id}`}
            name="seminarType"
            defaultValue={row.seminarType}
            className={inputClass}
          >
            {(Object.keys(SEMINAR_TYPE_LABELS) as SeminarType[]).map((type) => (
              <option key={type} value={type}>
                {SEMINAR_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={`heldAt-${row.id}`}
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Tanggal &amp; Waktu
          </label>
          <input
            id={`heldAt-${row.id}`}
            name="heldAt"
            type="datetime-local"
            required
            defaultValue={row.heldAtValue}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor={`location-${row.id}`}
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Ruang
          </label>
          <input
            id={`location-${row.id}`}
            name="location"
            maxLength={150}
            defaultValue={row.location ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor={`thesis-${row.id}`}
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Mahasiswa Terkait
          </label>
          <select
            id={`thesis-${row.id}`}
            name="thesisSubmissionId"
            defaultValue={row.thesisSubmissionId ?? ""}
            className={inputClass}
          >
            <option value="">— Tidak terkait pengajuan tertentu —</option>
            {linkedThesisMissing && (
              <option value={row.thesisSubmissionId ?? ""}>
                {row.studentName ?? "Mahasiswa"}
                {row.studentNim ? ` (${row.studentNim})` : ""}
                {row.thesisTitle ? ` — ${row.thesisTitle}` : ""}
              </option>
            )}
            {thesisOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <label
            htmlFor={`notes-${row.id}`}
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Dosen Penguji / Keterangan
          </label>
          <input
            id={`notes-${row.id}`}
            name="notes"
            maxLength={500}
            defaultValue={row.notes ?? ""}
            className={inputClass}
            placeholder="Contoh: Penguji 1 — Budi, M.Kom.; Penguji 2 — Sari, M.T."
          />
        </div>
      </div>

      <Message state={state} />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Tutup
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}

/** Tabel jadwal lengkap dengan tombol Edit (inline) dan Hapus. */
export function SeminarTable({
  rows,
  thesisOptions,
}: {
  rows: SeminarTableRow[];
  thesisOptions: ThesisOption[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="px-5 py-3 font-medium">Jenis</th>
            <th className="px-5 py-3 font-medium">Waktu</th>
            <th className="px-5 py-3 font-medium">Mahasiswa</th>
            <th className="px-5 py-3 font-medium">Ruang / Penguji</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const editing = editingId === row.id;
            return (
              <Fragment key={row.id}>
                <tr className="border-b border-slate-100 align-top last:border-0">
                  <td className="px-5 py-4">
                    <SeminarTypeBadge type={row.seminarType} />
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {row.heldAtLabel}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">
                      {row.studentName ?? "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.studentNim ?? "Umum"}
                    </p>
                    {row.thesisTitle && (
                      <p className="mt-0.5 max-w-xs text-xs text-slate-400">
                        {row.thesisTitle}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-slate-700">{row.location ?? "—"}</p>
                    <p className="mt-0.5 max-w-xs text-xs text-slate-500">
                      {row.notes ?? "—"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <SeminarWhenBadge upcoming={row.upcoming} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(editing ? null : row.id)}
                        aria-expanded={editing}
                        className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        {editing ? "Batal Edit" : "Edit Jadwal"}
                      </button>
                      <DeleteSeminarForm seminarId={row.id} />
                    </div>
                  </td>
                </tr>

                {editing && (
                  <tr className="border-b border-slate-200 last:border-0">
                    <td colSpan={6} className="bg-slate-50 px-5 py-4">
                      <EditSeminarFields
                        row={row}
                        thesisOptions={thesisOptions}
                        onClose={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
