import "server-only";

import { PDFDocument, type PDFEmbeddedPage, type PDFPage, type PageBoundingBox } from "pdf-lib";

import { buildBookletPlan, type BookletSide } from "@/lib/print/booklet";
import { printFormat } from "@/lib/print/format";

const MM_TO_PT = 72 / 25.4;

type SheetSize = { width: number; height: number };

function drawPageSlot(
  sheet: PDFPage,
  page: PDFEmbeddedPage | undefined,
  offsetX: number,
  slot: SheetSize,
) {
  if (!page) return;

  const { x, y, scale } = coverBookletSlot(page, offsetX, slot);
  sheet.drawPage(page, {
    x,
    y,
    xScale: scale,
    yScale: scale,
  });
}

/**
 * Chromium rounds the paper of a CSS `size: A5` page up to whole points
 * (420 x 595.92 pt instead of 419.53 x 595.28 pt), and Vivliostyle draws the
 * 148 x 210 mm page from the top-left corner: the extra strip on the right and
 * at the bottom shows the host page background. Keep only the CSS page.
 */
export function cssPageBox(paper: SheetSize, page: SheetSize): PageBoundingBox {
  const width = Math.min(paper.width, page.width);
  const height = Math.min(paper.height, page.height);

  return { left: 0, bottom: paper.height - height, right: width, top: paper.height };
}

/** A5 is 148 mm wide; half an A4 is 148.5 mm. Fill that half millimetre. */
export function coverBookletSlot(page: SheetSize, offsetX: number, slot: SheetSize) {
  const scale = Math.max(slot.width / page.width, slot.height / page.height);
  return {
    x: offsetX + (slot.width - page.width * scale) / 2,
    y: (slot.height - page.height * scale) / 2,
    scale,
  };
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
 * Imposes the A5 pages two-up on landscape A4 sheets: print duplex, flip on
 * short edge, fold.
 */
export async function imposeBookletPdf(pagesPdf: Uint8Array) {
  const { sheet, page } = printFormat;
  const sheetSize = { width: sheet.widthMm * MM_TO_PT, height: sheet.heightMm * MM_TO_PT };
  const pageSize = { width: page.widthMm * MM_TO_PT, height: page.heightMm * MM_TO_PT };
  const source = await PDFDocument.load(pagesPdf);
  const output = await PDFDocument.create();
  const sourcePages = source.getPages();
  const pages = await output.embedPages(
    sourcePages,
    sourcePages.map((sourcePage) => cssPageBox(sourcePage.getSize(), pageSize)),
  );
  const plan = buildBookletPlan(pages.length);

  for (const planned of plan.sheets) {
    drawSheetSide(output, planned.front, pages, sheetSize);
    drawSheetSide(output, planned.back, pages, sheetSize);
  }

  return output.save();
}
