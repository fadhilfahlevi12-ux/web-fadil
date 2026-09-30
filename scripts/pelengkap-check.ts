import "dotenv/config";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

import { db } from "../db";
import {
  letterRequests,
  seminarSchedules,
  thesisSubmissions,
  users,
  type Role,
} from "../db/schema";
import { listBimbingan } from "../lib/queries/bimbingan";
import { listKaprodiDecisions } from "../lib/queries/decisions";
import { listNotifications } from "../lib/queries/notifications";

/**
 * Pemeriksa pelengkap opsional (PRD §2, §3A, §3B):
 * 1. notifikasi in-app per role,
 * 2. riwayat keputusan Kaprodi,
 * 3. modul bimbingan dosen (mahasiswa bimbingan + jadwal seminar).
 *
 * Skrip menyisipkan satu skenario uji (surat ber-TTD, usulan judul dengan
 * pembimbing, dan jadwal seminar) lalu **selalu** menghapusnya kembali,
 * sehingga aman dijalankan berulang.
 *
 * Jalankan dengan: npm run pelengkap:check
 * (Skrip dijalankan dengan kondisi `react-server` karena `lib/queries/*`
 * diawali penanda `import "server-only"` seperti pada aplikasi.)
 */

const MARK = "UJI-SIMAP-PELENGKAP";
const NOW = new Date();

const failures: string[] = [];
let checks = 0;

function check(label: string, condition: boolean) {
  checks += 1;
  if (condition) {
    console.log(`  OK    ${label}`);
    return;
  }
  failures.push(label);
  console.log(`  GAGAL ${label}`);
}

/** Benar bila daftar waktu sudah terurut menurun (terbaru lebih dahulu). */
function sortedByNewest(dates: (Date | null)[]) {
  return dates.every(
    (date, index) =>
      index === 0 ||
      (dates[index - 1]?.getTime() ?? 0) >= (date?.getTime() ?? 0)
  );
}

async function findAccount(role: Role) {
  const [row] = await db
    .select({ id: users.id, name: users.name, nim: users.nim })
    .from(users)
    .where(eq(users.role, role))
    .limit(1);
  return row ?? null;
}

async function main() {
  const mahasiswa = await findAccount("mahasiswa");
  const admin = await findAccount("admin");
  const kaprodi = await findAccount("kaprodi");
  const dosen = await findAccount("dosen");

  if (!mahasiswa || !admin || !kaprodi || !dosen) {
    throw new Error(
      "Akun contoh belum lengkap — jalankan `npm run db:seed` lebih dahulu."
    );
  }

  console.log("== SIMAP TI UMPAR — pemeriksa pelengkap opsional ==\n");

  let letterId: string | null = null;
  let thesisId: string | null = null;
  let seminarId: string | null = null;
  const documentNumber = `TI/UJI/${NOW.getTime()}`;
  const heldAt = new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000);

  try {
    const [letter] = await db
      .insert(letterRequests)
      .values({
        userId: mahasiswa.id,
        letterType: "active_student",
        purpose: `${MARK} — pemeriksaan notifikasi`,
        status: "approved",
        staffVerifiedById: admin.id,
        verifiedAt: NOW,
        kaprodiApprovedById: kaprodi.id,
        approvedAt: NOW,
        documentNumber,
        qrToken: randomUUID().replace(/-/g, ""),
      })
      .returning({ id: letterRequests.id });
    letterId = letter.id;

    const [thesis] = await db
      .insert(thesisSubmissions)
      .values({
        userId: mahasiswa.id,
        title: `${MARK} — judul uji bimbingan`,
        summary:
          "Ringkasan uji otomatis untuk memeriksa modul bimbingan dosen.",
        status: "approved",
        decidedById: kaprodi.id,
        decidedAt: NOW,
        pembimbing1Id: dosen.id,
        pembimbingAssignedAt: NOW,
      })
      .returning({ id: thesisSubmissions.id });
    thesisId = thesis.id;

    const [seminar] = await db
      .insert(seminarSchedules)
      .values({
        thesisSubmissionId: thesis.id,
        seminarType: "proposal",
        heldAt,
        location: "Lab Komputer 2",
        notes: `${MARK} — penguji uji`,
        publishedById: admin.id,
      })
      .returning({ id: seminarSchedules.id });
    seminarId = seminar.id;

    console.log(
      `Skenario uji: surat ${letter.id}, skripsi ${thesis.id}, seminar ${seminar.id}\n`
    );

    console.log("1. Notifikasi in-app (PRD §3A)");
    const notifMahasiswa = await listNotifications({
      id: mahasiswa.id,
      role: "mahasiswa",
    });
    check(
      "Mahasiswa: surat selesai muncul beserta nomor dokumen",
      notifMahasiswa.some(
        (item) =>
          item.title.startsWith("Surat selesai") &&
          (item.detail ?? "").includes(documentNumber)
      )
    );
    check(
      "Mahasiswa: usulan judul disetujui muncul",
      notifMahasiswa.some((item) => item.title === "Usulan judul disetujui")
    );
    check(
      "Mahasiswa: jadwal seminar mendatang muncul",
      notifMahasiswa.some((item) => item.title.startsWith("Jadwal "))
    );
    check(
      "Notifikasi mahasiswa terurut terbaru lebih dahulu",
      sortedByNewest(notifMahasiswa.map((item) => item.at))
    );

    const notifAdmin = await listNotifications({ id: admin.id, role: "admin" });
    check(
      "Admin: jadwal seminar mendatang muncul",
      notifAdmin.some((item) => item.href === "/admin/jadwal")
    );

    const notifKaprodi = await listNotifications({
      id: kaprodi.id,
      role: "kaprodi",
    });
    check(
      "Kaprodi: surat yang baru ditandatangani muncul",
      notifKaprodi.some(
        (item) =>
          item.title.startsWith("Surat disetujui") &&
          (item.detail ?? "").includes(documentNumber)
      )
    );

    const notifDosen = await listNotifications({ id: dosen.id, role: "dosen" });
    check(
      "Dosen: mahasiswa bimbingan baru muncul",
      notifDosen.some(
        (item) =>
          item.title === "Mahasiswa bimbingan baru" &&
          (item.detail ?? "").includes(mahasiswa.name)
      )
    );
    check(
      "Dosen: seminar bimbingan muncul beserta ruangnya",
      notifDosen.some((item) => (item.detail ?? "").includes("Lab Komputer 2"))
    );

    console.log("\n2. Riwayat keputusan Kaprodi (PRD §3B)");
    const decisions = await listKaprodiDecisions(kaprodi.id);
    check(
      "Keputusan surat tercatat beserta nomor dokumen",
      decisions.some(
        (item) =>
          item.kind === "letter" &&
          item.outcome === "approved" &&
          item.note === documentNumber
      )
    );
    check(
      "Keputusan usulan judul tercatat",
      decisions.some(
        (item) => item.kind === "thesis" && item.title.includes(MARK)
      )
    );
    check(
      "Riwayat keputusan terurut terbaru lebih dahulu",
      sortedByNewest(decisions.map((item) => item.at))
    );

    console.log("\n3. Modul bimbingan dosen (PRD §2)");
    const bimbingan = await listBimbingan(dosen.id);
    const row = bimbingan.find((item) => item.thesisId === thesis.id);
    check("Mahasiswa bimbingan tampil untuk dosen", Boolean(row));
    check("Peran Pembimbing 1 dikenali", row?.asPembimbing1 === true);
    check(
      "Nama, NIM, dan judul mahasiswa ikut tampil",
      row?.studentName === mahasiswa.name &&
        row?.studentNim === mahasiswa.nim &&
        Boolean(row?.title.includes(MARK))
    );
    check(
      "Jadwal seminar bimbingan tampil dan ditandai mendatang",
      (row?.seminars.length ?? 0) >= 1 &&
        Boolean(row?.seminars.some((item) => item.upcoming))
    );
  } finally {
    // Pembersihan selalu dijalankan agar basis data kembali seperti semula.
    if (seminarId) {
      await db.delete(seminarSchedules).where(eq(seminarSchedules.id, seminarId));
    }
    if (thesisId) {
      await db
        .delete(thesisSubmissions)
        .where(eq(thesisSubmissions.id, thesisId));
    }
    if (letterId) {
      await db.delete(letterRequests).where(eq(letterRequests.id, letterId));
    }
    console.log("\nData uji dibersihkan.");
  }

  console.log(
    `\n${checks - failures.length}/${checks} pemeriksaan pelengkap lulus`
  );
  if (failures.length > 0) {
    throw new Error(`${failures.length} pemeriksaan gagal`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      "Gagal memeriksa pelengkap opsional:",
      error.message ?? error
    );
    process.exit(1);
  });
