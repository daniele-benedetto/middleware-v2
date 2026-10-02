import { z } from "zod";

import type { PrintMapDirectoryMetrics } from "@/lib/print/map-directory";
import type { PrintMapPlateOptions } from "@/lib/print/map-plate";

export const printFormatSchema = z.enum(["a4", "a5"]);

export type PrintFormat = z.infer<typeof printFormatSchema>;

const PT_TO_MM = 25.4 / 72;

export type PrintFormatSpec = {
  /** Label of the printed page, e.g. "A4". */
  pageLabel: string;
  /** Label of the sheet the booklet is imposed on, two pages per side. */
  sheetLabel: string;
  page: { widthMm: number; heightMm: number };
  sheet: { widthMm: number; heightMm: number };
  /** Stylesheets of the print source, in cascade order (see public/print). */
  stylesheets: string[];
  /** Whether images inside articles and meetings are printed. */
  bodyImages: boolean;
  /** Index entries that fit one page. */
  tocCapacity: number;
  mapPlate: PrintMapPlateOptions;
  mapDirectory: PrintMapDirectoryMetrics;
};

/**
 * Measures that depend on the page. They mirror `public/print/issue.css` (A4)
 * and `public/print/issue-a5.css` (A5, one column with a larger relative type
 * size, so the A4-folded booklet stays readable; images inside the text would
 * fill the whole column, so A5 leaves them out).
 */
export const printFormats: Record<PrintFormat, PrintFormatSpec> = {
  a4: {
    pageLabel: "A4",
    sheetLabel: "A3",
    page: { widthMm: 210, heightMm: 297 },
    sheet: { widthMm: 420, heightMm: 297 },
    stylesheets: ["/print/issue.css"],
    bodyImages: true,
    tocCapacity: 26,
    mapPlate: {
      widthMm: 178,
      heightMm: 200,
      safeWidthMm: 150,
      safeHeightMm: 100,
      tileSizeMm: 45,
      minZoom: 10,
      maxZoom: 16,
    },
    mapDirectory: {
      pageAreaHeightMm: 297 - 16 - 24,
      footerIntrusionMm: 7,
      footerGapMm: 4,
      headerHeightMm: 2 * 11.3 * 1.15 * PT_TO_MM,
      headerPaddingMm: 2,
      excerptMarginMm: 2,
      rowGapMm: 4,
      lineHeightMm: 14.5 * PT_TO_MM,
    },
  },
  a5: {
    pageLabel: "A5",
    sheetLabel: "A4",
    page: { widthMm: 148, heightMm: 210 },
    sheet: { widthMm: 297, heightMm: 210 },
    stylesheets: ["/print/issue.css", "/print/issue-a5.css"],
    bodyImages: false,
    tocCapacity: 21,
    mapPlate: {
      widthMm: 121,
      heightMm: 135,
      safeWidthMm: 100,
      safeHeightMm: 75,
      tileSizeMm: 45,
      minZoom: 10,
      maxZoom: 16,
    },
    mapDirectory: {
      pageAreaHeightMm: 210 - 12 - 19,
      footerIntrusionMm: 5,
      footerGapMm: 4,
      headerHeightMm: 2 * 10 * 1.15 * PT_TO_MM,
      headerPaddingMm: 1.5,
      excerptMarginMm: 1.5,
      rowGapMm: 3,
      lineHeightMm: 13 * PT_TO_MM,
    },
  },
};

export function resolvePrintFormat(value: string | null | undefined): PrintFormat {
  const parsed = printFormatSchema.safeParse(value ?? "a4");
  return parsed.success ? parsed.data : "a4";
}
