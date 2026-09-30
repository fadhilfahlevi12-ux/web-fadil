import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { thesisSubmissions, users } from "@/db/schema";
import { requireRole } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { EmptyState, PageHeader, SectionCard, StatCard } from "@/components/ui";
import {
  ApproveThesisForm,
  AssignPembimbingForm,
  RejectThesisForm,
} from "@/components/thesis-forms";
import { ThesisStatusBadge } from "./thesis-status-badge";

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  approved: 1,
  rejected: 2,
};

/** Halaman modul skripsi untuk Kaprodi: keputusan judul & penetapan pembimbing. */
export async function ThesisKaprodiView() {
  await requireRole("kaprodi");

  const rows = await db
    .select({ submission: thesisSubmissions, student: users })
    .from(thesisSubmissions)
    .innerJoin(users, eq(thesisSubmissions.userId, users.id))
    .orderBy(desc(thesisSubmissions.createdAt));

  const sorted = [...rows].sort((a, b) => {
    const diff =
      (STATUS_ORDER[a.submission.status] ?? 9) -
      (STATUS_ORDER[b.submission.status] ?? 9);
    if (diff !== 0) return diff;
    return (
      new Date(b.submission.createdAt).getTime() -
      new Date(a.submission.createdAt).getTime()
    );
  });

  const dosenRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.role, ["dosen", "kaprodi"]));

  const dosenOptions = [...dosenRows].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const dosenName = new Map(dosenOptions.map((row) => [row.id, row.name]));

  const pendingCount = rows.filter(
    (r) => r.submission.status === "pending"
  ).length;
  const approvedCount = rows.filter(
    (r) => r.submission.status === "approved"
  ).length;
  const rejectedCount = rows.filter(
    (r) => r.submission.status === "rejected"
  ).length;
  const needPembimbing = rows.filter(
    (r) => r.submission.status === "approved" && !r.submission.pembimbing1Id
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penetapan Judul & Pembimbing"
        description="Setujui usulan judul mahasiswa dan tetapkan Dosen Pembimbing 1 dan 2."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Menunggu keputusan"
          value={pendingCount}
          hint="Antrian usulan judul"
          icon="clock"
          tone="amber"
        />
        <StatCard
          label="Judul disetujui"
          value={approvedCount}
          hint="Siap ditetapkan pembimbing"
          icon="check"
          tone="green"
        />
        <StatCard
          label="Belum ada pembimbing"
          value={needPembimbing}
          hint="Perlu penetapan 1 & 2"
          icon="users"
          tone="blue"
        />
        <StatCard
          label="Usulan ditolak"
          value={rejectedCount}
          hint="Total penolakan"
          icon="alert"
          tone="red"
        />
      </div>

      <SectionCard
        title="Usulan Judul Masuk"
        description="Usulan yang menunggu keputusan tampil paling atas."
        bodyClassName="px-0 py-0"
      >
        {sorted.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              icon="graduation"
              title="Belum ada usulan judul"
              description="Usulan dari mahasiswa akan muncul di sini beserta tombol Setujui/Tolak dan form penetapan Dosen Pembimbing 1 & 2."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Pemohon</th>
                  <th className="px-5 py-3 font-medium">Judul Usulan</th>
                  <th className="px-5 py-3 font-medium">Diajukan</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ submission, student }) => (
                  <tr
                    key={submission.id}
                    className="border-b border-slate-100 align-top last:border-0"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student.nim ?? "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="max-w-sm font-medium text-slate-900">
                        {submission.title}
                      </p>
                      <p className="mt-0.5 max-w-sm text-xs text-slate-500">
                        {submission.summary}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDateTime(submission.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <ThesisStatusBadge status={submission.status} />
                      {submission.status === "rejected" &&
                        submission.rejectionReason && (
                          <p className="mt-1 max-w-[14rem] text-[11px] text-red-600">
                            Alasan: {submission.rejectionReason}
                          </p>
                        )}
                      {submission.status === "approved" &&
                        submission.decidedAt && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            Disetujui {formatDateTime(submission.decidedAt)}
                          </p>
                        )}
                    </td>
                    <td className="px-5 py-4">
                      {submission.status === "pending" ? (
                        <div className="space-y-2">
                          <ApproveThesisForm thesisId={submission.id} />
                          <RejectThesisForm thesisId={submission.id} />
                        </div>
                      ) : submission.status === "approved" ? (
                        <div className="min-w-[13rem] space-y-2">
                          <div className="rounded-lg bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-medium text-slate-500">
                              Dosen Pembimbing
                            </p>
                            <p className="text-xs text-slate-700">
                              1.{" "}
                              {submission.pembimbing1Id
                                ? (dosenName.get(submission.pembimbing1Id) ??
                                  "—")
                                : "belum ditetapkan"}
                            </p>
                            <p className="text-xs text-slate-700">
                              2.{" "}
                              {submission.pembimbing2Id
                                ? (dosenName.get(submission.pembimbing2Id) ??
                                  "—")
                                : "belum ditetapkan"}
                            </p>
                            {submission.pembimbingAssignedAt && (
                              <p className="mt-1 text-[10px] text-slate-400">
                                Ditetapkan{" "}
                                {formatDateTime(
                                  submission.pembimbingAssignedAt
                                )}
                              </p>
                            )}
                          </div>
                          <AssignPembimbingForm
                            thesisId={submission.id}
                            dosenOptions={dosenOptions}
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Tidak ada tindakan
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
