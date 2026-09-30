"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  archiveCategoryEnum,
  archiveDocuments,
  type ArchiveCategory,
} from "@/db/schema";
import { requireRole } from "@/lib/dal";
import {
  ARCHIVE_MAX_BYTES,
  deleteStorageObjectByUrl,
  isAllowedArchiveFile,
  isStorageConfigured,
  uploadArchiveFile,
} from "@/lib/storage";

/**
 * Server action modul Arsip Digital Prodi (PRD §3C).
 * Admin menyimpan dokumen resmi (SK Rektor, SK Mengajar, Akreditasi, MoU)
 * dengan dua opsi berkas: unggah PDF ke Supabase Storage atau tempel URL.
 */

export type ArchiveActionState = { error?: string; success?: string };

const TITLE_MIN = 3;
const TITLE_MAX = 255;
const DESC_MAX = 1000;
const URL_MAX = 1000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_RE.test(value);
}

function readCategory(value: FormDataEntryValue | null): ArchiveCategory | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw && (archiveCategoryEnum.enumValues as readonly string[]).includes(raw)) {
    return raw as ArchiveCategory;
  }
  return null;
}

function asUploadedFile(value: FormDataEntryValue | null) {
  if (!value || typeof value === "string") return null;
  const file = value as File;
  if (typeof file.size !== "number" || file.size === 0) return null;
  if (typeof file.arrayBuffer !== "function") return null;
  return file;
}

/** Tahun akademik format YYYY/YYYY dengan tahun kedua = tahun pertama + 1. */
function parseAcademicYear(
  raw: string
): { value: string | null } | { error: string } {
  if (!raw) return { value: null };

  const match = /^(\d{4})\/(\d{4})$/.exec(raw);
  if (!match) {
    return { error: "Tahun akademik harus berformat YYYY/YYYY (contoh: 2025/2026)." };
  }

  const start = Number(match[1]);
  const end = Number(match[2]);
  if (end !== start + 1) {
    return {
      error: "Tahun akademik tidak valid — tahun kedua harus tahun pertama + 1.",
    };
  }

  return { value: raw };
}

function revalidateArchive() {
  revalidatePath("/admin/arsip");
  revalidatePath("/admin");
}

/** Admin menyimpan dokumen arsip baru (unggah PDF atau URL). */
export async function createArchiveDocument(
  _prev: ArchiveActionState,
  formData: FormData
): Promise<ArchiveActionState> {
  const user = await requireRole("admin");

  const category = readCategory(formData.get("category"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const academicYearRaw = String(formData.get("academicYear") ?? "").trim();
  const fileUrlRaw = String(formData.get("fileUrl") ?? "").trim();
  const file = asUploadedFile(formData.get("file"));

  if (!category) {
    return { error: "Kategori dokumen tidak valid." };
  }
  if (title.length < TITLE_MIN) {
    return { error: `Judul dokumen minimal ${TITLE_MIN} karakter.` };
  }
  if (title.length > TITLE_MAX) {
    return { error: `Judul dokumen maksimal ${TITLE_MAX} karakter.` };
  }
  if (description && description.length > DESC_MAX) {
    return { error: `Deskripsi maksimal ${DESC_MAX} karakter.` };
  }

  const academicYear = parseAcademicYear(academicYearRaw);
  if ("error" in academicYear) return { error: academicYear.error };

  let fileUrl: string;

  if (file) {
    if (file.size > ARCHIVE_MAX_BYTES) {
      return {
        error: `Ukuran berkas maksimal ${Math.round(ARCHIVE_MAX_BYTES / (1024 * 1024))} MB.`,
      };
    }
    if (!isAllowedArchiveFile(file)) {
      return { error: "Berkas harus berformat PDF." };
    }
    if (!isStorageConfigured()) {
      return {
        error:
          "Penyimpanan berkas belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env, atau gunakan opsi URL dokumen.",
      };
    }

    const uploaded = await uploadArchiveFile(file);
    if ("error" in uploaded) return { error: uploaded.error };
    fileUrl = uploaded.url;
  } else if (fileUrlRaw) {
    if (!/^https?:\/\//i.test(fileUrlRaw)) {
      return { error: "URL dokumen harus diawali http:// atau https://" };
    }
    if (fileUrlRaw.length > URL_MAX) {
      return { error: `URL dokumen maksimal ${URL_MAX} karakter.` };
    }
    fileUrl = fileUrlRaw;
  } else {
    return { error: "Unggah berkas PDF atau isi URL dokumen." };
  }

  await db.insert(archiveDocuments).values({
    category,
    title,
    description,
    fileUrl,
    academicYear: academicYear.value,
    uploadedById: user.id,
  });

  revalidateArchive();
  return { success: "Dokumen arsip berhasil disimpan." };
}

/** Admin menghapus dokumen arsip (beserta objek storage bila ada). */
export async function deleteArchiveDocument(
  _prev: ArchiveActionState,
  formData: FormData
): Promise<ArchiveActionState> {
  await requireRole("admin");

  const documentId = String(formData.get("documentId") ?? "").trim();
  if (!isUuid(documentId)) {
    return { error: "ID dokumen tidak valid." };
  }

  const [deleted] = await db
    .delete(archiveDocuments)
    .where(eq(archiveDocuments.id, documentId))
    .returning({ id: archiveDocuments.id, fileUrl: archiveDocuments.fileUrl });

  if (!deleted) {
    return { error: "Dokumen tidak ditemukan." };
  }

  // Best effort: hapus objek di storage bila dokumen diunggah lewat aplikasi.
  await deleteStorageObjectByUrl(deleted.fileUrl);

  revalidateArchive();
  return { success: "Dokumen arsip dihapus." };
}
