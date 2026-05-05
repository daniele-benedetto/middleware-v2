import { keepPreviousData } from "@tanstack/react-query";

import { cmsQueryPolicy } from "@/lib/cms/trpc/query-policy";

export { cmsQueryPolicy };

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
