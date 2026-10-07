import { PDFParse } from "pdf-parse";

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedPdfResult {
  text: string;
  pageCount: number;
  pages: ExtractedPdfPage[];
}

/**
 * Ekstraksi teks dari buffer PDF secara digital (Kasus A: Serverless friendly).
 * Bekerja cepat di Vercel Node.js Serverless runtime per halaman.
 */
export async function extractTextFromPdfBuffer(
  buffer: Buffer
): Promise<ExtractedPdfResult> {
  const parser = new PDFParse({ data: buffer });
  try {
    const res = await parser.getText();
    const rawPages = Array.isArray(res.pages) ? res.pages : [];
    const pages: ExtractedPdfPage[] = rawPages.map((p: any, idx: number) => ({
      pageNumber: typeof p?.num === "number" ? p.num : idx + 1,
      text: (p?.text || "").trim(),
    }));

    const cleanText = (res.text || "").trim();
    const pageCount =
      typeof res.total === "number" && res.total > 0
        ? res.total
        : pages.length > 0
        ? pages.length
        : 1;

    return {
      text: cleanText,
      pageCount,
      pages,
    };
  } finally {
    await parser.destroy().catch(() => {});
  }
}
