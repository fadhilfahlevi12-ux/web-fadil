"use client";

import { useActionState } from "react";

import {
  LETTER_TYPE_LABELS,
  type LetterType,
} from "@/db/schema";
import { submitLetter, type LetterActionState } from "@/lib/actions/letters";
import { Callout, Card, PageHeader, SectionCard } from "@/components/ui";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

const initState: LetterActionState = {};

export function SubmitLetterForm() {
  const [state, formAction, pending] = useActionState(
    submitLetter,
    initState
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajukan Surat"
        description="Lengkapi formulir berikut. Status pengajuan dapat dipantau dari menu Pengajuan Surat."
      />

      <Callout tone="info">
        Formulir sudah tersambung ke penyimpanan data. Setelah dikirim, Anda
        akan diarahkan ke daftar surat untuk melihat status terbaru.
      </Callout>

      <Card>
        <form action={formAction} className="space-y-5 p-5 sm:p-6">
          <div>
            <label
              htmlFor="letterType"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Jenis Surat
            </label>
            <select
              id="letterType"
              name="letterType"
              required
              className={inputClass}
              defaultValue=""
            >
              <option value="" disabled>
                Pilih jenis surat…
              </option>
              {(Object.keys(LETTER_TYPE_LABELS) as LetterType[]).map((type) => (
                <option key={type} value={type}>
                  {LETTER_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="purpose"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Keperluan
            </label>
            <textarea
              id="purpose"
              name="purpose"
              required
              rows={3}
              maxLength={1000}
              className={inputClass}
              placeholder="Contoh: Surat pengantar untuk penelitian tugas akhir di Dinas Komunikasi dan Informatika…"
            />
          </div>

          <div>
            <label
              htmlFor="destination"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Tujuan / Instansi Tujuan
            </label>
            <input
              id="destination"
              name="destination"
              className={inputClass}
              placeholder="Nama instansi/pejabat tujuan surat (opsional)"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Keterangan Tambahan
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className={inputClass}
              placeholder="Informasi lain yang diperlukan (opsional)…"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <div className="flex items-center justify-end border-t border-slate-100 pt-4">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? "Mengirim..." : "Kirim Pengajuan"}
            </button>
          </div>
        </form>
      </Card>

      <SectionCard title="Persyaratan Umum">
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• Mengisi data diri yang valid saat pendaftaran akun.</li>
          <li>• Keperluan surat harus jelas dan dapat dipertanggungjawabkan.</li>
          <li>
            • Surat selesai tersedia dalam format PDF ber-QR Code untuk
            validasi keaslian.
          </li>
        </ul>
      </SectionCard>
    </div>
  );
}
