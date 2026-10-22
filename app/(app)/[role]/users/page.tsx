import { desc } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/dal";
import { Badge, PageHeader, SectionCard } from "@/components/ui";
import { CreateUserForm } from "./create-user-form";

const ROLE_LABEL: Record<string, string> = {
  mahasiswa: "Mahasiswa",
  admin: "Admin",
  kaprodi: "Kaprodi",
  dosen: "Dosen",
};

const ROLE_TONE: Record<string, "blue" | "green" | "violet" | "amber" | "neutral"> = {
  mahasiswa: "blue",
  admin: "violet",
  kaprodi: "amber",
  dosen: "green",
};

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  // Hanya admin yang boleh mengelola pengguna (layout role sudah menjamin,
  // requireRole memberi lapisan pengaman kedua).
  await requireRole("admin");
  await params;

  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pengguna"
        description="Buat akun Dosen dan Kaprodi. Cukup isi email, password, role, dan NIDN yang sudah terdaftar di menu Data Akademik — nama akun diambil otomatis dari data tersebut. Akun admin dibuat pengembang melalui seed script; akun mahasiswa dibuat melalui pendaftaran mandiri."
      />

      <SectionCard
        title="Buat Akun Dosen / Kaprodi"
        description="Akun ini tidak dapat didaftarkan oleh publik. NIDN divalidasi terhadap Data Akademik dan nama akun mengikuti data tersebut."
      >
        <CreateUserForm />
      </SectionCard>

      <SectionCard
        title="Daftar Pengguna"
        description="Seluruh akun yang terdaftar di sistem."
        bodyClassName="px-0 py-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">NIM / NIDN</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {user.name}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{user.email}</td>
                  <td className="px-5 py-3">
                    <Badge tone={ROLE_TONE[user.role] ?? "neutral"}>
                      {ROLE_LABEL[user.role] ?? user.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {user.nim ?? user.nidn ?? "—"}
                  </td>
                </tr>
              ))}
              {allUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    Belum ada pengguna terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
