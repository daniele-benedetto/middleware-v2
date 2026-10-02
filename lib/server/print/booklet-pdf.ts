import "server-only";

import { PDFDocument, type PDFEmbeddedPage, type PDFPage } from "pdf-lib";

import { buildBookletPlan, type BookletSide } from "@/lib/print/booklet";
import { printFormats, type PrintFormat } from "@/lib/print/format";

const MM_TO_PT = 72 / 25.4;

type SheetSize = { width: number; height: number };

function drawPageSlot(
  sheet: PDFPage,
  page: PDFEmbeddedPage | undefined,
  offsetX: number,
  slot: SheetSize,
) {
  if (!page) return;

  const scale = Math.min(slot.width / page.width, slot.height / page.height);
  sheet.drawPage(page, {
    x: offsetX + (slot.width - page.width * scale) / 2,
    y: (slot.height - page.height * scale) / 2,
    xScale: scale,
    yScale: scale,
  });
}

function drawSheetSide(
  output: PDFDocument,
  side: BookletSide,
  pages: PDFEmbeddedPage[],
  sheetSize: SheetSize,
) {
  const slot = { width: sheetSize.width / 2, height: sheetSize.height };
  const sheet = output.addPage([sheetSize.width, sheetSize.height]);
  drawPageSlot(sheet, side.left ? pages[side.left - 1] : undefined, 0, slot);
  drawPageSlot(sheet, side.right ? pages[side.right - 1] : undefined, slot.width, slot);
}

/**
 * Imposes the pages two-up on landscape sheets (A4 pages on A3, A5 pages on A4):
 * print duplex, flip on short edge, fold.
 */
export async function imposeBookletPdf(pagesPdf: Uint8Array, format: PrintFormat = "a4") {
  const { sheet } = printFormats[format];
  const sheetSize = { width: sheet.widthMm * MM_TO_PT, height: sheet.heightMm * MM_TO_PT };
  const source = await PDFDocument.load(pagesPdf);
  const output = await PDFDocument.create();
  const pages = await output.embedPages(source.getPages());
  const plan = buildBookletPlan(pages.length);

  for (const planned of plan.sheets) {
    drawSheetSide(output, planned.front, pages, sheetSize);
    drawSheetSide(output, planned.back, pages, sheetSize);
  }

  return output.save();
}
