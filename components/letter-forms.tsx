"use client";

import { useActionState } from "react";

import {
  approveLetter,
  rejectLetter,
  verifyLetter,
  type LetterActionState,
} from "@/lib/actions/letters";

const initState: LetterActionState = {};

const primaryBtn =
  "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-60";
const dangerBtn =
  "inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60";

function Message({ state }: { state: LetterActionState }) {
  if (!state.error && !state.success) return null;
  return (
    <p
      className={
        state.error
          ? "mt-1 max-w-[16rem] text-[11px] leading-snug text-red-600"
          : "mt-1 max-w-[16rem] text-[11px] leading-snug text-emerald-600"
      }
    >
      {state.error ?? state.success}
    </p>
  );
}

export function VerifyLetterForm({ letterId }: { letterId: string }) {
  const [state, formAction, pending] = useActionState(verifyLetter, initState);
  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="letterId" value={letterId} />
        <button
          type="submit"
          disabled={pending}
          className={`${primaryBtn} bg-blue-600 hover:bg-blue-700`}
        >
          {pending ? "Memproses..." : "Verifikasi"}
        </button>
      </form>
      <Message state={state} />
    </div>
  );
}

export function ApproveLetterForm({ letterId }: { letterId: string }) {
  const [state, formAction, pending] = useActionState(approveLetter, initState);
  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="letterId" value={letterId} />
        <button
          type="submit"
          disabled={pending}
          className={`${primaryBtn} bg-emerald-600 hover:bg-emerald-700`}
        >
          {pending ? "Memproses..." : "Setujui & TTD"}
        </button>
      </form>
      <Message state={state} />
    </div>
  );
}

export function RejectLetterForm({ letterId }: { letterId: string }) {
  const [state, formAction, pending] = useActionState(rejectLetter, initState);
  return (
    <div>
      <form action={formAction} className="flex flex-col gap-1">
        <input type="hidden" name="letterId" value={letterId} />
        <input
          type="text"
          name="reason"
          required
          maxLength={500}
          placeholder="Alasan penolakan"
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-red-300 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className={dangerBtn}
        >
          {pending ? "Memproses..." : "Tolak Pengajuan"}
        </button>
      </form>
      <Message state={state} />
    </div>
  );
}
