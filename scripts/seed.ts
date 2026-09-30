import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { users, type Role } from "../db/schema";

type SeedAccount = {
  email: string;
  password: string;
  name: string;
  role: Role;
  nim?: string;
  nidn?: string;
};

// Akun contoh (bootstrap) untuk menguji UI setiap role selama pengembangan.
// - Admin dibuat pengembang; Dosen/Kaprodi seharusnya dibuat lewat dashboard
//   admin, namun disertakan di sini agar mudah memeriksa semua role.
// - Mahasiswa dapat mendaftar mandiri; akun di bawah hanya contoh.
// Ubah email/password sesuai kebutuhan.
const accounts: SeedAccount[] = [
  {
    email: "admin@umpar.ac.id",
    password: "admin123",
    name: "Staf Administrasi",
    role: "admin",
  },
  {
    email: "kaprodi@umpar.ac.id",
    password: "kaprodi123",
    name: "Dr. Andi, M.Kom.",
    role: "kaprodi",
    nidn: "0912123401",
  },
  {
    email: "dosen@umpar.ac.id",
    password: "dosen123",
    name: "Budi, M.Kom.",
    role: "dosen",
    nidn: "0912123402",
  },
  {
    email: "mahasiswa@umpar.ac.id",
    password: "mahasiswa123",
    name: "Ahmad Fadil",
    role: "mahasiswa",
    nim: "2201010001",
  },
];

async function seed() {
  for (const account of accounts) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, account.email))
      .limit(1);

    if (existing) {
      console.log(`[skip] ${account.email} sudah ada`);
      continue;
    }

    const passwordHash = await bcrypt.hash(account.password, 10);

    await db.insert(users).values({
      email: account.email,
      passwordHash,
      name: account.name,
      role: account.role,
      nim: account.nim ?? null,
      nidn: account.nidn ?? null,
    });

    console.log(`[ok] ${account.email} (${account.role}) dibuat`);
  }

  console.log("\nKredensial akun:");
  for (const account of accounts) {
    console.log(`  ${account.role}: ${account.email} / ${account.password}`);
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Gagal seed:", error);
    process.exit(1);
  });
