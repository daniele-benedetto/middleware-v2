export type PaginationParams = {
  page: number;
  pageSize: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const rawPage = Number(searchParams.get("page") ?? DEFAULT_PAGE);
  const rawPageSize = Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.trunc(rawPage) : DEFAULT_PAGE;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(Math.trunc(rawPageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return { page, pageSize };
}
