"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  assignPembimbing,
  decideThesis,
  submitThesis,
  type ThesisActionState,
} from "@/lib/actions/thesis";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

const primaryBtn =
  "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-60";
const dangerBtn =
  "inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60";

const initState: ThesisActionState = {};

function Message({ state }: { state: ThesisActionState }) {
  if (!state.error && !state.success) return null;
  return (
    <p
      className={
        state.error
          ? "mt-1 max-w-[18rem] text-[11px] leading-snug text-red-600"
          : "mt-1 max-w-[18rem] text-[11px] leading-snug text-emerald-600"
      }
    >
      {state.error ?? state.success}
    </p>
  );
}

/** Form mahasiswa: usulan judul skripsi + ringkasan. */
export function SubmitThesisForm({ disabled = false }: { disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(submitThesis, initState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="title"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Judul Usulan
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={10}
          maxLength={300}
          disabled={disabled}
          className={inputClass}
          placeholder="Contoh: Sistem Informasi Manajemen Administrasi Prodi Berbasis Web"
        />
      </div>

      <div>
        <label
          htmlFor="summary"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Ringkasan
        </label>
        <textarea
          id="summary"
          name="summary"
          required
          rows={5}
          minLength={20}
          maxLength={3000}
          disabled={disabled}
          className={inputClass}
          placeholder="Latar belakang, tujuan, dan metode singkat penelitian…"
        />
      </div>

      <Message state={state} />

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button
          type="submit"
          disabled={pending || disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Mengirim..." : "Ajukan Judul"}
        </button>
      </div>
    </form>
  );
}

/** Tombol Kaprodi: setujui usulan judul. */
export function ApproveThesisForm({ thesisId }: { thesisId: string }) {
  const [state, formAction, pending] = useActionState(decideThesis, initState);
  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="thesisId" value={thesisId} />
        <input type="hidden" name="decision" value="approve" />
        <button
          type="submit"
          disabled={pending}
          className={`${primaryBtn} bg-emerald-600 hover:bg-emerald-700`}
        >
          {pending ? "Memproses..." : "Setujui Judul"}
        </button>
      </form>
      <Message state={state} />
    </div>
  );
}

/** Form Kaprodi: tolak usulan judul beserta alasannya. */
export function RejectThesisForm({ thesisId }: { thesisId: string }) {
  const [state, formAction, pending] = useActionState(decideThesis, initState);
  return (
    <div>
      <form action={formAction} className="flex flex-col gap-1">
        <input type="hidden" name="thesisId" value={thesisId} />
        <input type="hidden" name="decision" value="reject" />
        <input
          type="text"
          name="reason"
          required
          maxLength={500}
          placeholder="Alasan penolakan"
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-red-300 focus:outline-none"
        />
        <button type="submit" disabled={pending} className={dangerBtn}>
          {pending ? "Memproses..." : "Tolak Usulan"}
        </button>
      </form>
      <Message state={state} />
    </div>
  );
}

/** Form Kaprodi: penetapan Dosen Pembimbing 1 & 2. */
export function AssignPembimbingForm({
  thesisId,
  dosenOptions,
}: {
  thesisId: string;
  dosenOptions: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    assignPembimbing,
    initState
  );

  const selectClass =
    "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none";

  return (
    <div>
      <form action={formAction} className="flex flex-col gap-1.5">
        <input type="hidden" name="thesisId" value={thesisId} />

        <select
          name="pembimbing1Id"
          required
          defaultValue=""
          aria-label="Dosen Pembimbing 1"
          className={selectClass}
        >
          <option value="" disabled>
            Pembimbing 1…
          </option>
          {dosenOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <select
          name="pembimbing2Id"
          defaultValue=""
          aria-label="Dosen Pembimbing 2 (opsional)"
          className={selectClass}
        >
          <option value="">Tanpa pembimbing 2</option>
          {dosenOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={pending}
          className={`${primaryBtn} bg-blue-600 hover:bg-blue-700`}
        >
          {pending ? "Menyimpan..." : "Tetapkan Pembimbing"}
        </button>
      </form>
      <Message state={state} />
    </div>
  );
}

