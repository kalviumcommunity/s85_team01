import fs from 'fs';

export interface PageText {
  pageNumber: number;
  text: string;
}

export interface DocumentChunkDraft {
  pageNumber: number;
  chunkIndex: number;
  content: string;
}

/**
 * Extracts text from PDF page by page using pdfjs-dist.
 */
// Polyfill DOMMatrix and Path2D in Node environment to eliminate canvas warnings
if (typeof (global as any).DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {};
}
if (typeof (global as any).Path2D === 'undefined') {
  (global as any).Path2D = class Path2D {};
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

export async function extractPdfPages(filePath: string): Promise<{ pages: PageText[]; totalPages: number }> {

  const fileBuffer = await fs.promises.readFile(filePath);
  const data = new Uint8Array(fileBuffer);

  const doc = await pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  const totalPages = doc.numPages;
  const pages: PageText[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => (item.str ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pages.push({
      pageNumber: i,
      text: pageText,
    });
  }

  // Verify that there is actual extractable text
  const totalExtractedLength = pages.reduce((acc, p) => acc + p.text.trim().length, 0);
  if (totalExtractedLength < 15) {
    throw new Error('Text could not be extracted from this PDF.');
  }

  return { pages, totalPages };
}

/**
 * Creates page-aware chunks with moderate size and overlap.
 * Keeps documentId and pageNumber intact.
 */
export function chunkPages(
  pages: PageText[],
  chunkSize = 600,
  chunkOverlap = 100
): DocumentChunkDraft[] {
  const chunks: DocumentChunkDraft[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;

    if (text.length <= chunkSize) {
      chunks.push({
        pageNumber: page.pageNumber,
        chunkIndex: globalChunkIndex++,
        content: text,
      });
      continue;
    }

    let start = 0;
    while (start < text.length) {
      let end = start + chunkSize;
      if (end >= text.length) {
        end = text.length;
      } else {
        // Try to break at sentence or word boundary
        const lastPeriod = text.lastIndexOf('. ', end);
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastPeriod > start + chunkSize * 0.5) {
          end = lastPeriod + 1;
        } else if (lastSpace > start + chunkSize * 0.5) {
          end = lastSpace;
        }
      }

      const chunkContent = text.slice(start, end).trim();
      if (chunkContent.length > 20) {
        chunks.push({
          pageNumber: page.pageNumber,
          chunkIndex: globalChunkIndex++,
          content: chunkContent,
        });
      }

      if (end >= text.length) break;
      start = end - chunkOverlap;
    }
  }

  return chunks;
}
