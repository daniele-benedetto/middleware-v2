const PT_TO_MM = 25.4 / 72;

/** Mirrors public/print/issue.css: page area, footer QR and entry chrome, in mm. */
export const printMapDirectoryMetrics = {
  pageAreaHeightMm: 297 - 16 - 24,
  footerIntrusionMm: 7,
  footerGapMm: 4,
  headerHeightMm: 2 * 11.3 * 1.15 * PT_TO_MM,
  headerPaddingMm: 2,
  excerptMarginMm: 2,
  rowGapMm: 4,
  lineHeightMm: 14.5 * PT_TO_MM,
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
  metrics = printMapDirectoryMetrics,
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
