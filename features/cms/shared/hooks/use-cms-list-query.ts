import { keepPreviousData } from "@tanstack/react-query";

const ONE_SECOND_MS = 1_000;
const ONE_MINUTE_MS = 60 * ONE_SECOND_MS;

export const cmsQueryPolicy = {
  list: {
    staleTimeMs: 30 * ONE_SECOND_MS,
    gcTimeMs: 5 * ONE_MINUTE_MS,
    retryCount: 1,
  },
  options: {
    staleTimeMs: ONE_MINUTE_MS,
  },
} as const;

export type CmsListInput<TQuery> = {
  page: number;
  pageSize: number;
  query?: TQuery;
};

export type CmsPagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type CmsListOutput<TItem> = {
  items: TItem[];
  pagination: CmsPagination;
};

export const cmsListQueryOptions = {
  placeholderData: keepPreviousData,
  staleTime: cmsQueryPolicy.list.staleTimeMs,
  gcTime: cmsQueryPolicy.list.gcTimeMs,
  retry: cmsQueryPolicy.list.retryCount,
} as const;

export const cmsOptionsQueryOptions = {
  staleTime: cmsQueryPolicy.options.staleTimeMs,
} as const;

export function withCmsListOutput<TItem>(
  data: CmsListOutput<TItem> | undefined,
  input: { page: number; pageSize: number },
): CmsListOutput<TItem> {
  if (data) {
    return data;
  }

  return {
    items: [],
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total: 0,
    },
  };
}
