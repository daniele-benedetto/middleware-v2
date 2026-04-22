import { z } from "zod";

import { parseWithZod } from "@/lib/server/validation/parse";

export type PaginationParams = {
  page: number;
  pageSize: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const result = parseWithZod(
    {
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    },
    paginationSchema,
  );

  return { page: result.page, pageSize: result.pageSize };
}
