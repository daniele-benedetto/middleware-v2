import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { imposeBookletPdf } from "@/lib/server/print/booklet-pdf";

const A4: [number, number] = [595.92, 841.92];

async function createPagesPdf(pageCount: number) {
  const document = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    document.addPage(A4).drawText(String(index + 1), { x: 20, y: 20, size: 12 });
  }
  return document.save();
}

describe("imposeBookletPdf", () => {
  it("lays out padded A4 pages on duplex A3 landscape sheets", async () => {
    const booklet = await PDFDocument.load(await imposeBookletPdf(await createPagesPdf(10)));
    const sheets = booklet.getPages();

    expect(sheets).toHaveLength(6);
    for (const sheet of sheets) {
      expect(sheet.getWidth()).toBeCloseTo(1190.55, 1);
      expect(sheet.getHeight()).toBeCloseTo(841.89, 1);
    }
  });
});
