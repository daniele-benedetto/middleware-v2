import { z } from "zod";

import { paginationDefaults } from "@/lib/server/http/pagination";

import type { RouterInputs } from "@/lib/trpc/types";

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

type CmsSerializableParam = string | number | boolean | null | undefined;
type CmsSerializableSearchParams = Record<string, CmsSerializableParam>;

const uuidSchema = z.string().uuid();

const articleStatusValues = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const roleValues = ["ADMIN", "EDITOR"] as const;
const issuesSortByValues = ["createdAt", "sortOrder", "publishedAt"] as const;
const categoriesSortByValues = ["createdAt", "name", "slug"] as const;
const tagsSortByValues = ["createdAt", "name", "slug"] as const;
const articlesSortByValues = ["createdAt", "publishedAt", "position"] as const;
const usersSortByValues = ["createdAt", "email"] as const;

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

function cleanString(value: string | undefined) {
  const result = value?.trim();

  if (!result || result.length === 0) {
    return undefined;
  }

  return result;
}

function parseBooleanQueryParam(value: string | undefined): "true" | "false" | undefined {
  if (value === "true" || value === "false") {
    return value;
  }

  return undefined;
}

function parseEnumQueryParam<const T extends readonly string[]>(
  value: string | undefined,
  values: T,
): T[number] | undefined {
  if (!value) {
    return undefined;
  }

  return values.includes(value as T[number]) ? (value as T[number]) : undefined;
}

function parseUuidQueryParam(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return uuidSchema.safeParse(value).success ? value : undefined;
}

function compactObject<T extends Record<string, unknown>>(input: T) {
  const output: Record<string, unknown> = {};

  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) {
      output[key] = value;
    }
  });

  return output as T;
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

export function serializeCmsSearchParams(input: CmsSerializableSearchParams) {
  const searchParams = new URLSearchParams();

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams;
}

type IssuesListInput = RouterInputs["issues"]["list"];
type CategoriesListInput = RouterInputs["categories"]["list"];
type TagsListInput = RouterInputs["tags"]["list"];
type ArticlesListInput = RouterInputs["articles"]["list"];
type UsersListInput = RouterInputs["users"]["list"];

export function parseIssuesListSearchParams(input: CmsSearchParamsInput): IssuesListInput {
  const base = parseCmsListSearchParams(input, {
    allowedSortBy: issuesSortByValues,
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });
  const sortBy = parseEnumQueryParam(base.sortBy, issuesSortByValues) ?? "createdAt";

  return {
    page: base.page,
    pageSize: base.pageSize,
    query: compactObject({
      isActive: parseBooleanQueryParam(readParam(input, "isActive")),
      published: parseBooleanQueryParam(readParam(input, "published")),
      q: base.q,
      sortBy,
      sortOrder: base.sortOrder,
    }),
  };
}

export function parseCategoriesListSearchParams(input: CmsSearchParamsInput): CategoriesListInput {
  const base = parseCmsListSearchParams(input, {
    allowedSortBy: categoriesSortByValues,
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });
  const sortBy = parseEnumQueryParam(base.sortBy, categoriesSortByValues) ?? "createdAt";

  return {
    page: base.page,
    pageSize: base.pageSize,
    query: compactObject({
      isActive: parseBooleanQueryParam(readParam(input, "isActive")),
      q: base.q,
      sortBy,
      sortOrder: base.sortOrder,
    }),
  };
}

export function parseTagsListSearchParams(input: CmsSearchParamsInput): TagsListInput {
  const base = parseCmsListSearchParams(input, {
    allowedSortBy: tagsSortByValues,
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });
  const sortBy = parseEnumQueryParam(base.sortBy, tagsSortByValues) ?? "createdAt";

  return {
    page: base.page,
    pageSize: base.pageSize,
    query: compactObject({
      isActive: parseBooleanQueryParam(readParam(input, "isActive")),
      q: base.q,
      sortBy,
      sortOrder: base.sortOrder,
    }),
  };
}

export function parseArticlesListSearchParams(input: CmsSearchParamsInput): ArticlesListInput {
  const base = parseCmsListSearchParams(input, {
    allowedSortBy: articlesSortByValues,
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });
  const sortBy = parseEnumQueryParam(base.sortBy, articlesSortByValues) ?? "createdAt";

  return {
    page: base.page,
    pageSize: base.pageSize,
    query: compactObject({
      status: parseEnumQueryParam(cleanString(readParam(input, "status")), articleStatusValues),
      issueId: parseUuidQueryParam(readParam(input, "issueId")),
      categoryId: parseUuidQueryParam(readParam(input, "categoryId")),
      authorId: parseUuidQueryParam(readParam(input, "authorId")),
      featured: parseBooleanQueryParam(readParam(input, "featured")),
      q: base.q,
      sortBy,
      sortOrder: base.sortOrder,
    }),
  };
}

export function parseUsersListSearchParams(input: CmsSearchParamsInput): UsersListInput {
  const base = parseCmsListSearchParams(input, {
    allowedSortBy: usersSortByValues,
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });
  const sortBy = parseEnumQueryParam(base.sortBy, usersSortByValues) ?? "createdAt";

  return {
    page: base.page,
    pageSize: base.pageSize,
    query: compactObject({
      role: parseEnumQueryParam(cleanString(readParam(input, "role")), roleValues),
      q: base.q,
      sortBy,
      sortOrder: base.sortOrder,
    }),
  };
}
