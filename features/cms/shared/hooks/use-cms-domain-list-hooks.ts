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

type CmsListQueryOptions<TInput, TOutput> = {
  initialDataInput?: TInput;
  initialData?: TOutput;
};

function isSameInput<TInput>(left: TInput | undefined, right: TInput | undefined) {
  if (!left || !right) {
    return false;
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

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
  options?: CmsListQueryOptions<IssuesListInput, IssuesListOutput>,
): CmsListQueryState<IssuesListOutput["items"][number]> {
  const hasMatchingInitialInput = isSameInput(input, options?.initialDataInput);

  const query = trpc.issues.list.useQuery(input, {
    ...cmsListQueryOptions,
    initialData: hasMatchingInitialInput ? options?.initialData : undefined,
  });
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
  options?: CmsListQueryOptions<CategoriesListInput, CategoriesListOutput>,
): CmsListQueryState<CategoriesListOutput["items"][number]> {
  const hasMatchingInitialInput = isSameInput(input, options?.initialDataInput);

  const query = trpc.categories.list.useQuery(input, {
    ...cmsListQueryOptions,
    initialData: hasMatchingInitialInput ? options?.initialData : undefined,
  });
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
  options?: CmsListQueryOptions<TagsListInput, TagsListOutput>,
): CmsListQueryState<TagsListOutput["items"][number]> {
  const hasMatchingInitialInput = isSameInput(input, options?.initialDataInput);

  const query = trpc.tags.list.useQuery(input, {
    ...cmsListQueryOptions,
    initialData: hasMatchingInitialInput ? options?.initialData : undefined,
  });
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
  options?: CmsListQueryOptions<ArticlesListInput, ArticlesListOutput>,
): CmsListQueryState<ArticlesListOutput["items"][number]> {
  const hasMatchingInitialInput = isSameInput(input, options?.initialDataInput);

  const query = trpc.articles.list.useQuery(input, {
    ...cmsListQueryOptions,
    initialData: hasMatchingInitialInput ? options?.initialData : undefined,
  });
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
  options?: CmsListQueryOptions<UsersListInput, UsersListOutput>,
): CmsListQueryState<UsersListOutput["items"][number]> {
  const hasMatchingInitialInput = isSameInput(input, options?.initialDataInput);

  const query = trpc.users.list.useQuery(input, {
    ...cmsListQueryOptions,
    initialData: hasMatchingInitialInput ? options?.initialData : undefined,
  });
  const paginationInput = { page: input.page ?? 1, pageSize: input.pageSize ?? 20 };

  return toListQueryState(query.data, paginationInput, {
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  });
}
