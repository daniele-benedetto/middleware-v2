"use client";

import {
  cmsListQueryOptions,
  withCmsListOutput,
} from "@/features/cms/shared/hooks/use-cms-list-query";
import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CmsListQueryState<TItem> = {
  items: TItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  retry: () => void;
};

function toListQueryState<TItem>(
  data:
    | { items: TItem[]; pagination: { page: number; pageSize: number; total: number } }
    | undefined,
  input: { page: number; pageSize: number },
  state: {
    isPending: boolean;
    isFetching: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => Promise<unknown>;
  },
): CmsListQueryState<TItem> {
  const output = withCmsListOutput(data, input);

  return {
    items: output.items,
    pagination: output.pagination,
    isPending: state.isPending,
    isFetching: state.isFetching,
    isError: state.isError,
    error: state.error,
    retry: () => {
      void state.refetch();
    },
  };
}

type IssuesListInput = RouterInputs["issues"]["list"];
type CategoriesListInput = RouterInputs["categories"]["list"];
type TagsListInput = RouterInputs["tags"]["list"];
type ArticlesListInput = RouterInputs["articles"]["list"];
type UsersListInput = RouterInputs["users"]["list"];

type IssuesListOutput = RouterOutputs["issues"]["list"];
type CategoriesListOutput = RouterOutputs["categories"]["list"];
type TagsListOutput = RouterOutputs["tags"]["list"];
type ArticlesListOutput = RouterOutputs["articles"]["list"];
type UsersListOutput = RouterOutputs["users"]["list"];

export function useIssuesListQuery(
  input: IssuesListInput,
): CmsListQueryState<IssuesListOutput["items"][number]> {
  const query = trpc.issues.list.useQuery(input, cmsListQueryOptions);
  const paginationInput = { page: input.page ?? 1, pageSize: input.pageSize ?? 20 };

  return toListQueryState(query.data, paginationInput, {
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  });
}

export function useCategoriesListQuery(
  input: CategoriesListInput,
): CmsListQueryState<CategoriesListOutput["items"][number]> {
  const query = trpc.categories.list.useQuery(input, cmsListQueryOptions);
  const paginationInput = { page: input.page ?? 1, pageSize: input.pageSize ?? 20 };

  return toListQueryState(query.data, paginationInput, {
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  });
}

export function useTagsListQuery(
  input: TagsListInput,
): CmsListQueryState<TagsListOutput["items"][number]> {
  const query = trpc.tags.list.useQuery(input, cmsListQueryOptions);
  const paginationInput = { page: input.page ?? 1, pageSize: input.pageSize ?? 20 };

  return toListQueryState(query.data, paginationInput, {
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  });
}

export function useArticlesListQuery(
  input: ArticlesListInput,
): CmsListQueryState<ArticlesListOutput["items"][number]> {
  const query = trpc.articles.list.useQuery(input, cmsListQueryOptions);
  const paginationInput = { page: input.page ?? 1, pageSize: input.pageSize ?? 20 };

  return toListQueryState(query.data, paginationInput, {
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  });
}

export function useUsersListQuery(
  input: UsersListInput,
): CmsListQueryState<UsersListOutput["items"][number]> {
  const query = trpc.users.list.useQuery(input, cmsListQueryOptions);
  const paginationInput = { page: input.page ?? 1, pageSize: input.pageSize ?? 20 };

  return toListQueryState(query.data, paginationInput, {
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  });
}
