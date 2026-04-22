import { z } from "zod";

import { paginationDefaults } from "@/lib/server/http/pagination";

type CmsSearchParamValue = string | string[] | undefined;

export type CmsSearchParamsInput = URLSearchParams | Record<string, CmsSearchParamValue>;

type ParseCmsListSearchParamsOptions = {
  allowedSortBy?: readonly string[];
  defaultSortBy?: string;
  defaultSortOrder?: "asc" | "desc";
};

export type CmsListSearchParams = {
  page: number;
  pageSize: number;
  q?: string;
  sortBy?: string;
  sortOrder: "asc" | "desc";
};

function readParam(input: CmsSearchParamsInput, key: string) {
  if (input instanceof URLSearchParams) {
    return input.get(key) ?? undefined;
  }

  const value = input[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function parseCmsListSearchParams(
  input: CmsSearchParamsInput,
  options: ParseCmsListSearchParamsOptions = {},
): CmsListSearchParams {
  const schema = z.object({
    page: z.coerce.number().int().min(1).default(paginationDefaults.page),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(paginationDefaults.maxPageSize)
      .default(paginationDefaults.pageSize),
    q: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    sortBy: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    sortOrder: z.enum(["asc", "desc"]).default(options.defaultSortOrder ?? "desc"),
  });

  const parsed = schema.parse({
    page: readParam(input, "page"),
    pageSize: readParam(input, "pageSize"),
    q: readParam(input, "q"),
    sortBy: readParam(input, "sortBy"),
    sortOrder: readParam(input, "sortOrder"),
  });

  let sortBy = parsed.sortBy;

  if (options.allowedSortBy && options.allowedSortBy.length > 0) {
    if (!sortBy || !options.allowedSortBy.includes(sortBy)) {
      sortBy = options.defaultSortBy ?? options.allowedSortBy[0];
    }
  } else if (!sortBy && options.defaultSortBy) {
    sortBy = options.defaultSortBy;
  }

  return {
    page: parsed.page,
    pageSize: parsed.pageSize,
    q: parsed.q,
    sortOrder: parsed.sortOrder,
    sortBy,
  };
}
