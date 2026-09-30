export function formatDateTime(
  value: Date | string | null | undefined
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tanggal panjang tanpa jam — dipakai pada badan surat PDF (mis. 17 September 2026). */
export function formatDateLong(
  value: Date | string | null | undefined
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Nilai untuk input HTML `type="datetime-local"` (format `YYYY-MM-DDTHH:mm`)
 * memakai zona waktu server — konsisten dengan cara form mengirim balik nilai
 * tersebut (`new Date(value)` di server action).
 */
export function toDateTimeLocalValue(
  value: Date | string | null | undefined
): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join("T");
}
