import { keepPreviousData } from "@tanstack/react-query";

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
  staleTime: 30_000,
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
