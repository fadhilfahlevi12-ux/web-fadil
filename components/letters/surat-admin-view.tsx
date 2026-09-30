import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { letterRequests, users } from "@/db/schema";
import { LETTER_TYPE_LABELS } from "@/db/schema";
import { requireRole } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { letterPdfHref } from "@/lib/letters/links";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import {
  RejectLetterForm,
  VerifyLetterForm,
} from "@/components/letter-forms";
import { LetterStatusBadge } from "./letter-status-badge";

const STATUS_ORDER: Record<string, number> = {
  pending_staff: 0,
  pending_kaprodi: 1,
  rejected: 2,
  approved: 3,
};

export async function SuratAdminView() {
  await requireRole("admin");

  const rows = await db
    .select({ request: letterRequests, requester: users })
    .from(letterRequests)
    .innerJoin(users, eq(letterRequests.userId, users.id))
    .orderBy(desc(letterRequests.createdAt));

  const sorted = [...rows].sort((a, b) => {
    const diff =
      (STATUS_ORDER[a.request.status] ?? 9) -
      (STATUS_ORDER[b.request.status] ?? 9);
    if (diff !== 0) return diff;
    return (
      new Date(b.request.createdAt).getTime() -
      new Date(a.request.createdAt).getTime()
    );
  });

  const pendingCount = rows.filter(
    (r) => r.request.status === "pending_staff"
  ).length;
  const ttdCount = rows.filter(
    (r) => r.request.status === "pending_kaprodi"
  ).length;
  const doneCount = rows.filter((r) => r.request.status === "approved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verifikasi Pengajuan Surat"
        description="Periksa kelengkapan berkas mahasiswa lalu teruskan ke Kaprodi untuk tanda tangan."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-700">Menunggu verifikasi</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium text-blue-700">Siap TTD Kaprodi</p>
          <p className="mt-1 text-2xl font-bold text-blue-800">{ttdCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-700">Surat selesai</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{doneCount}</p>
        </div>
      </div>

      <SectionCard
        title="Daftar Pengajuan"
        description="Antrian verifikasi tampil paling atas."
        bodyClassName="px-0 py-0"
      >
        {sorted.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              icon="inbox"
              title="Belum ada pengajuan surat"
              description="Pengajuan baru dari mahasiswa akan muncul di sini."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Pemohon</th>
                  <th className="px-5 py-3 font-medium">Jenis Surat</th>
                  <th className="px-5 py-3 font-medium">Diajukan</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ request, requester }) => (
                  <tr
                    key={request.id}
                    className="border-b border-slate-100 align-top last:border-0"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{requester.name}</p>
                      <p className="text-xs text-slate-500">{requester.nim ?? "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">
                        {LETTER_TYPE_LABELS[request.letterType]}
                      </p>
                      <p className="mt-0.5 max-w-[18rem] text-xs text-slate-500">
                        {request.purpose}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDateTime(request.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <LetterStatusBadge status={request.status} />
                    </td>
                    <td className="px-5 py-4">
                      {request.status === "pending_staff" ? (
                        <div className="space-y-2">
                          <VerifyLetterForm letterId={request.id} />
                          <RejectLetterForm letterId={request.id} />
                        </div>
                      ) : request.status === "approved" ? (
                        <div className="space-y-1">
                          <span className="block text-xs text-slate-400">
                            Telah diproses
                          </span>
                          <a
                            href={letterPdfHref(request)}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs font-semibold text-blue-600 hover:underline"
                          >
                            Unduh PDF
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {request.status === "rejected"
                            ? request.rejectionReason ?? "Ditolak"
                            : "Telah diproses"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}