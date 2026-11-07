import { PDFArray, PDFDict, PDFDocument, PDFName, type PDFNumber, PDFStream } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { coverBookletSlot, cssPageBox, imposeBookletPdf } from "@/lib/server/print/booklet-pdf";

const A5: [number, number] = [419.53, 595.28];

async function createPagesPdf(pageCount: number, size = A5) {
  const document = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    document.addPage(size).drawText(String(index + 1), { x: 20, y: 20, size: 12 });
  }
  return document.save();
}

describe("imposeBookletPdf", () => {
  it("extends an A5 page across its A4 half without a white edge", () => {
    const slot = { width: (297 * 72) / 25.4 / 2, height: (210 * 72) / 25.4 };
    const { x, y, scale } = coverBookletSlot({ width: A5[0], height: A5[1] }, slot.width, slot);

    expect(x).toBeCloseTo(slot.width, 2);
    expect(A5[0] * scale).toBeGreaterThanOrEqual(slot.width);
    expect(y).toBeLessThanOrEqual(0);
  });

  it("drops the strip Chromium adds beyond the CSS page on the right and at the bottom", () => {
    const chromiumPaper = { width: 420, height: 595.92 };
    const box = cssPageBox(chromiumPaper, { width: A5[0], height: A5[1] });

    expect(box.left).toBe(0);
    expect(box.top).toBe(595.92);
    expect(box.right).toBeCloseTo(A5[0], 2);
    expect(box.bottom).toBeCloseTo(595.92 - A5[1], 2);
    expect(cssPageBox({ width: A5[0], height: A5[1] }, { width: 420, height: 600 })).toEqual({
      left: 0,
      bottom: 0,
      right: A5[0],
      top: A5[1],
    });
  });

  it("imposes only the CSS page of a Chromium page, edge to edge", async () => {
    const booklet = await PDFDocument.load(
      await imposeBookletPdf(await createPagesPdf(1, [420, 595.92])),
    );
    const xObjects = booklet
      .getPages()[0]!
      .node.Resources()!
      .lookup(PDFName.of("XObject"), PDFDict);
    const [embedded] = [...xObjects.asMap().values()].map((ref) =>
      booklet.context.lookup(ref, PDFStream),
    );
    const bbox = embedded!.dict
      .lookup(PDFName.of("BBox"), PDFArray)
      .asArray()
      .map((value) => (value as PDFNumber).asNumber());

    expect(bbox[2]! - bbox[0]!).toBeCloseTo(A5[0], 1);
    expect(bbox[3]! - bbox[1]!).toBeCloseTo(A5[1], 1);
  });

  it("lays out padded A5 pages on duplex A4 landscape sheets", async () => {
    const booklet = await PDFDocument.load(await imposeBookletPdf(await createPagesPdf(6)));
    const sheets = booklet.getPages();

    expect(sheets).toHaveLength(4);
    for (const sheet of sheets) {
      expect(sheet.getWidth()).toBeCloseTo(841.89, 1);
      expect(sheet.getHeight()).toBeCloseTo(595.28, 1);
    }
  });
});
