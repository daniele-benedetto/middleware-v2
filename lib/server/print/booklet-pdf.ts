import "server-only";

import { PDFDocument, type PDFEmbeddedPage, type PDFPage } from "pdf-lib";

import { buildBookletPlan, type BookletSide } from "@/lib/print/booklet";

const MM_TO_PT = 72 / 25.4;
const A4_WIDTH_PT = 210 * MM_TO_PT;
const A4_HEIGHT_PT = 297 * MM_TO_PT;

function drawPageSlot(sheet: PDFPage, page: PDFEmbeddedPage | undefined, offsetX: number) {
  if (!page) return;

  const scale = Math.min(A4_WIDTH_PT / page.width, A4_HEIGHT_PT / page.height);
  sheet.drawPage(page, {
    x: offsetX + (A4_WIDTH_PT - page.width * scale) / 2,
    y: (A4_HEIGHT_PT - page.height * scale) / 2,
    xScale: scale,
    yScale: scale,
  });
}

function drawSheetSide(output: PDFDocument, side: BookletSide, pages: PDFEmbeddedPage[]) {
  const sheet = output.addPage([A4_WIDTH_PT * 2, A4_HEIGHT_PT]);
  drawPageSlot(sheet, side.left ? pages[side.left - 1] : undefined, 0);
  drawPageSlot(sheet, side.right ? pages[side.right - 1] : undefined, A4_WIDTH_PT);
}

/** Imposes A4 pages on A3 landscape sheets: print duplex, flip on short edge, fold. */
export async function imposeBookletPdf(pagesPdf: Uint8Array) {
  const source = await PDFDocument.load(pagesPdf);
  const output = await PDFDocument.create();
  const pages = await output.embedPages(source.getPages());
  const plan = buildBookletPlan(pages.length);

  for (const sheet of plan.sheets) {
    drawSheetSide(output, sheet.front, pages);
    drawSheetSide(output, sheet.back, pages);
  }

  return output.save();
}
