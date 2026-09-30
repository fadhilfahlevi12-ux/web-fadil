import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { thesisSubmissions, users } from "@/db/schema";
import { requireRole } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import {
  Callout,
  EmptyState,
  PageHeader,
  SectionCard,
  StepList,
} from "@/components/ui";
import { SubmitThesisForm } from "@/components/thesis-forms";
import { ThesisStatusBadge } from "./thesis-status-badge";

const ALUR = [
  { title: "Ajukan Judul", description: "Isi judul usulan + ringkasan." },
  {
    title: "Persetujuan Kaprodi",
    description: "Kaprodi menyetujui atau menolak usulan.",
  },
  {
    title: "Penetapan Pembimbing",
    description: "Dosen Pembimbing 1 dan 2 ditetapkan.",
  },
  { title: "Bimbingan", description: "Proses bimbingan tugas akhir dimulai." },
];

/** Halaman modul skripsi untuk mahasiswa: usulan judul + statusnya. */
export async function ThesisMahasiswaView() {
  const user = await requireRole("mahasiswa");

  const submissions = await db
    .select()
    .from(thesisSubmissions)
    .where(eq(thesisSubmissions.userId, user.id))
    .orderBy(desc(thesisSubmissions.createdAt));

  const dosenRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.role, ["dosen", "kaprodi"]));

  const dosenName = new Map(dosenRows.map((row) => [row.id, row.name]));

  const active = submissions.find(
    (row) => row.status === "pending" || row.status === "approved"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengajuan Judul Skripsi"
        description="Usulkan judul skripsi beserta ringkasannya untuk diproses Kaprodi."
      />

      <SectionCard
        title="Alur Pengajuan"
        description="Proses administrasi tugas akhir."
      >
        <StepList steps={ALUR} />
      </SectionCard>

      <SectionCard
        title="Ajukan Judul Baru"
        description="Formulir usulan judul skripsi."
      >
        {active ? (
          <Callout tone="warn">
            Anda masih memiliki usulan{" "}
            <strong>{active.title}</strong> dengan status{" "}
            {active.status === "pending" ? "menunggu persetujuan" : "disetujui"}.
            Formulir pengajuan baru akan aktif setelah usulan tersebut selesai
            diproses.
          </Callout>
        ) : null}
        <div className={active ? "mt-4" : undefined}>
          <SubmitThesisForm disabled={Boolean(active)} />
        </div>
      </SectionCard>

      <SectionCard
        title="Status Pengajuan Saya"
        description="Riwayat usulan judul dan penetapan pembimbing."
        bodyClassName="px-0 py-0"
      >
        {submissions.length === 0 ? (
          <div className="px-5 py-6">
            <EmptyState
              icon="graduation"
              title="Belum ada pengajuan judul"
              description="Setelah formulir di atas dikirim, status usulan beserta pembimbing yang ditetapkan akan tampil di sini."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Judul Usulan</th>
                  <th className="px-5 py-3 font-medium">Diajukan</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Pembimbing</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 align-top last:border-0"
                  >
                    <td className="px-5 py-4">
                      <p className="max-w-md font-medium text-slate-900">
                        {row.title}
                      </p>
                      <p className="mt-0.5 max-w-md text-xs text-slate-500">
                        {row.summary}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <ThesisStatusBadge status={row.status} />
                      {row.status === "rejected" && row.rejectionReason && (
                        <p className="mt-1 max-w-[16rem] text-[11px] text-red-600">
                          Alasan: {row.rejectionReason}
                        </p>
                      )}
                      {row.status === "approved" && row.decidedAt && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Disetujui {formatDateTime(row.decidedAt)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {row.pembimbing1Id ? (
                        <>
                          <p className="text-xs">
                            1. {dosenName.get(row.pembimbing1Id) ?? "—"}
                          </p>
                          <p className="text-xs">
                            2.{" "}
                            {row.pembimbing2Id
                              ? (dosenName.get(row.pembimbing2Id) ?? "—")
                              : "belum ditetapkan"}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Belum ditetapkan
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
