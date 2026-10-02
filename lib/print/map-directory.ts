import { printFormats } from "@/lib/print/format";

/** Page area, footer QR and entry chrome in mm, mirroring the print stylesheets. */
export type PrintMapDirectoryMetrics = {
  pageAreaHeightMm: number;
  footerIntrusionMm: number;
  footerGapMm: number;
  headerHeightMm: number;
  headerPaddingMm: number;
  excerptMarginMm: number;
  rowGapMm: number;
  lineHeightMm: number;
};

export type PrintMapDirectoryLayout = {
  rowHeightMm: number;
  excerptLines: number;
};

/**
 * Every entry fits on a single page: rows share the available height and each
 * excerpt gets as many whole lines as its row can hold.
 */
export function buildPrintMapDirectoryLayout(
  entryCount: number,
  metrics: PrintMapDirectoryMetrics = printFormats.a4.mapDirectory,
): PrintMapDirectoryLayout {
  const rows = Math.max(1, Math.ceil(entryCount / 2));
  const availableMm = metrics.pageAreaHeightMm - metrics.footerIntrusionMm - metrics.footerGapMm;
  const rowHeightMm = availableMm / rows;
  const excerptSpaceMm =
    rowHeightMm -
    metrics.headerHeightMm -
    metrics.headerPaddingMm -
    metrics.excerptMarginMm -
    metrics.rowGapMm;

  return {
    rowHeightMm: Math.floor(rowHeightMm * 100) / 100,
    excerptLines: Math.max(0, Math.floor(excerptSpaceMm / metrics.lineHeightMm)),
  };
}
