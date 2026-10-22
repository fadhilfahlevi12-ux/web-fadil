"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  MEMBER_IDENTIFIER_LABELS,
  MEMBER_TYPE_LABELS,
  type MemberType,
} from "@/db/schema";
import {
  bulkImportMembers,
  createCampusMember,
  deleteCampusMember,
  type MemberActionState,
} from "@/lib/actions/members";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

const labelClass = "mb-1 block text-sm font-medium text-slate-700";

const submitClass =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60";

const initState: MemberActionState = {};

function Message({ state }: { state: MemberActionState }) {
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

/** Admin menambah satu data akademik (NAMA + NIM/NIDN). */
export function AddMemberForm() {
  const [state, formAction, pending] = useActionState(
    createCampusMember,
    initState
  );
  const [memberType, setMemberType] = useState<MemberType>("mahasiswa");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  const identifierLabel = MEMBER_IDENTIFIER_LABELS[memberType];

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="memberType" className={labelClass}>
            Jenis Data
          </label>
          <select
            id="memberType"
            name="memberType"
            value={memberType}
            onChange={(event) =>
              setMemberType(event.target.value as MemberType)
            }
            className={inputClass}
          >
            {(Object.keys(MEMBER_TYPE_LABELS) as MemberType[]).map((type) => (
              <option key={type} value={type}>
                {MEMBER_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="name" className={labelClass}>
            Nama Lengkap
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={255}
            placeholder="Sesuai data prodi"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="identifier" className={labelClass}>
            {identifierLabel}
          </label>
          <input
            id="identifier"
            name="identifier"
            required
            minLength={4}
            maxLength={30}
            placeholder={
              memberType === "mahasiswa" ? "2201010001" : "0912345678"
            }
            className={inputClass}
          />
        </div>
      </div>

      <Message state={state} />

      <button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Menyimpan..." : "Tambah Data"}
      </button>
    </form>
  );
}

/** Admin mengimpor banyak baris sekaligus (tempel dari Excel/teks). */
export function BulkImportMembersForm() {
  const [state, formAction, pending] = useActionState(
    bulkImportMembers,
    initState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  const textareaClass = `${inputClass} min-h-40 font-mono text-xs leading-relaxed`;

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor="mahasiswaRows" className={labelClass}>
            Data Mahasiswa — <code>NAMA;NIM</code>
          </label>
          <textarea
            id="mahasiswaRows"
            name="mahasiswaRows"
            className={textareaClass}
            placeholder={"Ahmad Fadil;2201010001\nSitti Aminah;2201010002"}
          />
          <p className="mt-1 text-xs text-slate-500">
            Satu baris satu mahasiswa. Pemisah boleh <code>;</code>{" "}
            <code>|</code> atau tab (hasil salin dari Excel).
          </p>
        </div>

        <div>
          <label htmlFor="dosenRows" className={labelClass}>
            Data Dosen — <code>NAMA;NIDN</code>
          </label>
          <textarea
            id="dosenRows"
            name="dosenRows"
            className={textareaClass}
            placeholder={"Dr. Andi, M.Kom.;0912123401\nBudi, M.Kom.;0912123402"}
          />
          <p className="mt-1 text-xs text-slate-500">
            Satu baris satu dosen. Koma pada gelar aman karena pemisahnya{" "}
            <code>;</code>, <code>|</code>, atau tab.
          </p>
        </div>
      </div>

      <Message state={state} />

      <button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Mengimpor..." : "Impor Data"}
      </button>
    </form>
  );
}

/** Tombol hapus per baris (hanya aktif bila data belum dipakai). */
export function DeleteMemberForm({
  memberId,
  claimed,
}: {
  memberId: string;
  claimed: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    deleteCampusMember,
    initState
  );

  if (claimed) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="memberId" value={memberId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
      >
        {pending ? "Menghapus..." : "Hapus"}
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
