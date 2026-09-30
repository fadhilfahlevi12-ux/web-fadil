import "server-only";

import { headers } from "next/headers";

/**
 * Basis URL aplikasi, dipakai untuk membuat tautan absolut yang dicetak pada
 * QR Code surat (mis. https://simap.umpar.ac.id/validasi/<token>).
 *
 * Urutan penentuan: env APP_URL (NEXT_PUBLIC_APP_URL) → header host permintaan
 * → http://localhost:3000 sebagai fallback pengembangan.
 */
export const DEFAULT_APP_URL = "http://localhost:3000";

export async function appBaseUrl(): Promise<string> {
  const configured = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (configured) return configured;

  // `headers()` hanya tersedia pada request runtime (Server Action / Route Handler).
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return DEFAULT_APP_URL;

  const isLocal = host.startsWith("localhost") || host.startsWith("127.");
  const proto =
    headerList.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

/** URL absolut halaman publik validasi untuk sebuah token QR. */
export async function verificationUrl(qrToken: string): Promise<string> {
  return `${await appBaseUrl()}/validasi/${qrToken}`;
}
