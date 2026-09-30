import { randomUUID } from "crypto";

/**
 * Helper penyimpanan berkas arsip (Supabase Storage).
 *
 * Sengaja TIDAK memakai `server-only` agar dapat diuji langsung dengan tsx
 * (unit test memakai mock server). Hanya boleh dipanggil dari Server Action.
 *
 * Endpoint REST Storage yang dipakai (upload objek standar):
 *   POST {SUPABASE_URL}/storage/v1/object/{bucket}/{path}
 *   header: Authorization: Bearer {service role key}, Content-Type, x-upsert
 *   sukses 2xx, gagal 4xx (mis. 400 "Asset Already Exists")
 *
 * URL publik objek (bucket public):
 *   {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
 */

export const ARCHIVE_MAX_BYTES = 10 * 1024 * 1024;
export const ARCHIVE_DEFAULT_BUCKET = "arsip-prodi";
export const ARCHIVE_MIME = "application/pdf";
export const LETTER_MIME = "application/pdf";

export type StorageConfig = {
  url: string;
  key: string;
  bucket: string;
  configured: boolean;
};

export function storageConfig(): StorageConfig {
  const url = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const bucket =
    (process.env.SUPABASE_STORAGE_BUCKET ?? "").trim() || ARCHIVE_DEFAULT_BUCKET;

  return { url, key, bucket, configured: Boolean(url && key) };
}

/** True bila SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY tersedia. */
export function isStorageConfigured() {
  return storageConfig().configured;
}

/** Berkas harus PDF (dicek dari MIME atau ekstensi). */
export function isAllowedArchiveFile(file: { type: string; name: string }) {
  return file.type === ARCHIVE_MIME || /\.pdf$/i.test(file.name);
}

export function safeFileName(name: string) {
  const cleaned = name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return cleaned || "dokumen.pdf";
}

function errorMessageFrom(body: string) {
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    return parsed.message ?? parsed.error ?? "";
  } catch {
    return body.slice(0, 200);
  }
}

export type UploadResult = { url: string } | { error: string };

const STORAGE_NOT_CONFIGURED =
  "Penyimpanan berkas belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY, atau gunakan input URL dokumen.";

/** Simpan objek ke bucket storage dan kembalikan URL publiknya. */
async function putObject(
  path: string,
  contentType: string,
  body: BodyInit
): Promise<UploadResult> {
  const { url, key, bucket, configured } = storageConfig();
  if (!configured) return { error: STORAGE_NOT_CONFIGURED };

  const endpoint = `${url}/storage/v1/object/${bucket}/${path}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": contentType,
        "x-upsert": "false",
      },
      body,
    });

    if (!response.ok) {
      const detail = errorMessageFrom(await response.text());
      return {
        error: `Gagal mengunggah berkas (HTTP ${response.status})${detail ? `: ${detail}` : "."}`,
      };
    }

    return { url: `${url}/storage/v1/object/public/${bucket}/${path}` };
  } catch (error) {
    return {
      error: `Gagal menghubungi penyimpanan: ${(error as Error).message}`,
    };
  }
}

/** Path objek arsip prodi: `arsip/<tahun>/<uuid>-<nama berkas>`. */
export function archiveObjectPath(fileName: string) {
  return `arsip/${new Date().getFullYear()}/${randomUUID()}-${safeFileName(fileName)}`;
}

/** Path objek PDF surat: `surat/<tahun>/<uuid>-<nama berkas>`. */
export function letterObjectPath(fileName: string) {
  return `surat/${new Date().getFullYear()}/${randomUUID()}-${safeFileName(fileName)}`;
}

/** Unggah berkas arsip ke Supabase Storage dan kembalikan URL publiknya. */
export async function uploadArchiveFile(file: {
  name: string;
  type: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
}): Promise<UploadResult> {
  if (!isStorageConfigured()) return { error: STORAGE_NOT_CONFIGURED };

  return putObject(
    archiveObjectPath(file.name),
    file.type || ARCHIVE_MIME,
    await file.arrayBuffer()
  );
}

/**
 * Unggah PDF surat hasil generator ke `surat/<tahun>/…` (PRD §3A).
 * Dipakai `approveLetter` agar dokumen siap unduh punya URL permanen.
 */
export async function uploadLetterPdf(
  pdf: Uint8Array,
  fileName: string
): Promise<UploadResult> {
  return putObject(letterObjectPath(fileName), LETTER_MIME, new Uint8Array(pdf));
}

/**
 * Hapus objek storage berdasarkan URL publiknya (best effort).
 * Dipanggil setelah baris database dihapus; kegagalan tidak menghentikan proses.
 */
export async function deleteStorageObjectByUrl(fileUrl: string) {
  const { url, key, bucket, configured } = storageConfig();
  if (!configured) return false;

  const prefix = `${url}/storage/v1/object/public/${bucket}/`;
  if (!fileUrl.startsWith(prefix)) return false;

  const path = fileUrl.slice(prefix.length).split("?")[0];

  try {
    const response = await fetch(
      `${url}/storage/v1/object/${bucket}/${path}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${key}` } }
    );
    return response.ok;
  } catch {
    return false;
  }
}
