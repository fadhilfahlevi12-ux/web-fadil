import { auth } from "@/auth";
import { getLaporanExport } from "@/lib/reports/laporan-data";
import { buildLaporanPdf } from "@/lib/reports/laporan-pdf";
import { buildLaporanXlsx } from "@/lib/reports/laporan-xlsx";

/**
 * Ekspor laporan & rekap administrasi (PRD §3D).
 *
 * GET /api/laporan/export?format=excel|pdf
 * Hanya untuk admin dan Kaprodi; isinya sama dengan halaman /<role>/laporan
 * (dihitung langsung dari basis data pada saat berkas diminta).
 */

export const runtime = "nodejs";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function jsonError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    return jsonError(401, "Silakan masuk untuk mengunduh laporan.");
  }
  if (user.role !== "admin" && user.role !== "kaprodi") {
    return jsonError(403, "Ekspor laporan hanya tersedia untuk admin dan Kaprodi.");
  }

  const format =
    new URL(request.url).searchParams.get("format") === "excel"
      ? "excel"
      : "pdf";

  const data = await getLaporanExport({ id: user.id, role: user.role });
  const baseName = `laporan-simap-${data.role}-${data.generatedAt
    .toISOString()
    .slice(0, 10)}`;

  const bytes =
    format === "excel"
      ? await buildLaporanXlsx(data)
      : await buildLaporanPdf(data);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": format === "excel" ? XLSX_MIME : "application/pdf",
      "Content-Disposition": `attachment; filename="${baseName}.${format === "excel" ? "xlsx" : "pdf"}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
