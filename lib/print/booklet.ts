export type BookletSide = { left: number | null; right: number | null };

export type BookletSheet = { front: BookletSide; back: BookletSide };

export type BookletPlan = {
  pageCount: number;
  paddedPageCount: number;
  sheets: BookletSheet[];
};

const PAGES_PER_SHEET = 4;

function pageOrBlank(page: number, pageCount: number) {
  return page <= pageCount ? page : null;
}

/**
 * Saddle-stitch imposition for pages printed two-up on a sheet twice their size
 * (A4 on A3, A5 on A4), duplex flipped on the short edge. Page numbers are
 * 1-based; missing pages become blanks at the end.
 */
export function buildBookletPlan(pageCount: number): BookletPlan {
  const paddedPageCount = Math.max(
    PAGES_PER_SHEET,
    Math.ceil(pageCount / PAGES_PER_SHEET) * PAGES_PER_SHEET,
  );
  const sheets = Array.from({ length: paddedPageCount / PAGES_PER_SHEET }, (_, index) => {
    const outer = paddedPageCount - 2 * index;
    const inner = 2 * index + 1;

    return {
      front: { left: pageOrBlank(outer, pageCount), right: pageOrBlank(inner, pageCount) },
      back: { left: pageOrBlank(inner + 1, pageCount), right: pageOrBlank(outer - 1, pageCount) },
    };
  });

  return { pageCount, paddedPageCount, sheets };
}
