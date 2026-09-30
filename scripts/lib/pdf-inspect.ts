import { inflateSync } from "zlib";

import { PDFName, PDFRawStream, type PDFDocument } from "pdf-lib";

/**
 * Kumpulkan seluruh teks yang benar-benar tercetak pada PDF.
 *
 * pdf-lib menyimpan teks sebagai PDFHexString (`<48454C4C4F>`) di dalam
 * content stream yang bisa terkompresi Flate, sehingga pencarian string
 * mentah tidak cukup: stream di-inflate lebih dulu, barulah string hex dan
 * literal diterjemahkan kembali menjadi teks.
 *
 * Dipakai oleh `scripts/pdf-check.ts` dan `scripts/laporan-check.ts`.
 */
export function printedText(doc: PDFDocument): string {
  const chunks: string[] = [];

  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    if (object.dict.get(PDFName.of("Subtype"))?.toString() === "/Image") {
      continue;
    }

    const filter = object.dict.get(PDFName.of("Filter"))?.toString() ?? "";
    let bytes = Buffer.from(object.contents);

    if (filter.includes("FlateDecode")) {
      try {
        bytes = inflateSync(bytes);
      } catch {
        continue;
      }
    }

    const content = bytes.toString("latin1");
    for (const match of content.matchAll(/<([0-9A-Fa-f]+)>/g)) {
      chunks.push(Buffer.from(match[1], "hex").toString("latin1"));
    }
    for (const match of content.matchAll(/\(((?:\\.|[^\\()])*)\)/g)) {
      chunks.push(match[1].replace(/\\([()\\])/g, "$1"));
    }
  }

  return chunks.join("\n");
}

/** Salinan ArrayBuffer tepat sepanjang `bytes` (aman untuk pustaka yang menolak Uint8Array). */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}
