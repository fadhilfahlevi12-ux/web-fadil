import "dotenv/config";
import { count, eq } from "drizzle-orm";

import { db } from "../db";
import {
  archiveDocuments,
  letterRequests,
  seminarSchedules,
  thesisSubmissions,
  users,
  type Role,
} from "../db/schema";

/**
 * Pemeriksa cepat kondisi basis data setelah `db:migrate` & `db:seed`.
 * Jalankan dengan: npm run db:check
 */

const ROLES: Role[] = ["mahasiswa", "admin", "kaprodi", "dosen"];

async function main() {
  const { value: userTotal } = (
    await db.select({ value: count() }).from(users)
  )[0];

  console.log("== SIMAP TI UMPAR — status basis data ==\n");
  console.log(`users                : ${userTotal} baris`);

  for (const role of ROLES) {
    const { value } = (
      await db.select({ value: count() }).from(users).where(eq(users.role, role))
    )[0];
    console.log(`  - ${role.padEnd(17)}: ${value}`);
  }

  const { value: letterTotal } = (
    await db.select({ value: count() }).from(letterRequests)
  )[0];
  const { value: thesisTotal } = (
    await db.select({ value: count() }).from(thesisSubmissions)
  )[0];
  const { value: seminarTotal } = (
    await db.select({ value: count() }).from(seminarSchedules)
  )[0];
  const { value: archiveTotal } = (
    await db.select({ value: count() }).from(archiveDocuments)
  )[0];

  console.log(`\nletter_requests      : ${letterTotal} baris`);
  console.log(`thesis_submissions   : ${thesisTotal} baris`);
  console.log(`seminar_schedules    : ${seminarTotal} baris`);
  console.log(`archive_documents    : ${archiveTotal} baris`);

  const [pendingStaff] = await db
    .select({ value: count() })
    .from(letterRequests)
    .where(eq(letterRequests.status, "pending_staff"));
  const [pendingKaprodi] = await db
    .select({ value: count() })
    .from(letterRequests)
    .where(eq(letterRequests.status, "pending_kaprodi"));

  console.log(
    `\nAntrian surat        : ${pendingStaff.value} menunggu verifikasi staf, ${pendingKaprodi.value} menunggu TTD Kaprodi`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Gagal memeriksa basis data:", error);
    process.exit(1);
  });
