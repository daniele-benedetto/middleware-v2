import type { PrintMapDirectoryMetrics } from "@/lib/print/map-directory";
import type { PrintMapPlateOptions } from "@/lib/print/map-plate";

const PT_TO_MM = 25.4 / 72;

export type PrintFormatSpec = {
  /** Label of the printed page. */
  pageLabel: string;
  /** Label of the sheet the booklet is imposed on, two pages per side. */
  sheetLabel: string;
  page: { widthMm: number; heightMm: number };
  sheet: { widthMm: number; heightMm: number };
  /** Index entries that fit one page. */
  tocCapacity: number;
  mapPlate: PrintMapPlateOptions;
  mapDirectory: PrintMapDirectoryMetrics;
};

export const PRINT_STYLESHEET = "/print/issue.css";

/**
 * The issue is printed on A5 pages, imposed two-up on A4 sheets and folded into
 * a booklet. These measures depend on the page and mirror `public/print/issue.css`.
 */
export const printFormat: PrintFormatSpec = {
  pageLabel: "A5",
  sheetLabel: "A4",
  page: { widthMm: 148, heightMm: 210 },
  sheet: { widthMm: 297, heightMm: 210 },
  tocCapacity: 21,
  mapPlate: {
    widthMm: 121,
    heightMm: 128,
    safeWidthMm: 100,
    safeHeightMm: 75,
    tileSizeMm: 45,
    minZoom: 10,
    maxZoom: 16,
  },
  mapDirectory: {
    pageAreaHeightMm: 210 - 19 - 19,
    footerIntrusionMm: 5,
    footerGapMm: 4,
    headerHeightMm: 2 * 10 * 1.15 * PT_TO_MM,
    headerPaddingMm: 1.5,
    excerptMarginMm: 1.5,
    rowGapMm: 3,
    lineHeightMm: 13 * PT_TO_MM,
  },
};
