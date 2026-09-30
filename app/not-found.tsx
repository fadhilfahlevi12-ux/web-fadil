import Link from "next/link";

/**
 * Halaman 404 global — menjaga tampilan tetap konsisten dengan tema SIMAP
 * ketika pengguna membuka URL yang tidak dikenal.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="grid h-12 w-12 mx-auto place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-black text-white">
          S
        </div>
        <p className="mt-5 text-4xl font-black tracking-tight text-slate-900">
          404
        </p>
        <h1 className="mt-1 text-base font-semibold text-slate-800">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Alamat yang Anda tuju tidak tersedia pada SIMAP TI UMPAR. Periksa
          kembali tautan atau kembali ke halaman utama sesuai peran akun Anda.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Masuk ke SIMAP
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Halaman Utama
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          SIMAP — Sistem Informasi Manajemen Administrasi Prodi TI UMPAR
        </p>
      </div>
    </main>
  );
}
