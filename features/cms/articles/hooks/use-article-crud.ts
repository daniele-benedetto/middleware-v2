"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CreateArticleInput = RouterInputs["articles"]["create"];
type UpdateArticleInput = RouterInputs["articles"]["update"]["data"];
type SyncArticleTagsInput = RouterInputs["articles"]["syncTags"]["data"];
type ArticleDetail = RouterOutputs["articles"]["getById"];

export function useArticleById(articleId?: string, options?: { initialData?: ArticleDetail }) {
  return trpc.articles.getById.useQuery(
    { id: articleId ?? "" },
    {
      enabled: Boolean(articleId),
      staleTime: 30_000,
      initialData: options?.initialData,
    },
  );
}

export function useArticleCreate() {
  return trpc.articles.create.useMutation();
}

export function useArticleUpdate() {
  return trpc.articles.update.useMutation();
}

export function useArticleSyncTags() {
  return trpc.articles.syncTags.useMutation();
}

export function useArticlesReorder() {
  return trpc.articles.reorder.useMutation();
}

export function useTagOptions() {
  return trpc.tags.list.useQuery(
    {
      page: 1,
      pageSize: 100,
      query: {
        sortBy: "name",
        sortOrder: "asc",
      },
    },
    { staleTime: 60_000 },
  );
}

export function useIssueOptions() {
  return trpc.issues.list.useQuery(
    {
      page: 1,
      pageSize: 100,
      query: {
        sortBy: "sortOrder",
        sortOrder: "asc",
      },
    },
    { staleTime: 60_000 },
  );
}

export function useCategoryOptions() {
  return trpc.categories.list.useQuery(
    {
      page: 1,
      pageSize: 100,
      query: {
        sortBy: "name",
        sortOrder: "asc",
      },
    },
    { staleTime: 60_000 },
  );
}

export function useUserOptions() {
  return trpc.users.listAuthors.useQuery(
    {
      page: 1,
      pageSize: 100,
      query: {},
    },
    { staleTime: 60_000 },
  );
}

export type { ArticleDetail, CreateArticleInput, SyncArticleTagsInput, UpdateArticleInput };
