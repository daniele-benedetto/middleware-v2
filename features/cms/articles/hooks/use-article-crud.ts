"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs } from "@/lib/trpc/types";

type CreateArticleInput = RouterInputs["articles"]["create"];
type UpdateArticleInput = RouterInputs["articles"]["update"]["data"];
type SyncArticleTagsInput = RouterInputs["articles"]["syncTags"]["data"];

export function useArticleById(articleId?: string) {
  return trpc.articles.getById.useQuery(
    { id: articleId ?? "" },
    {
      enabled: Boolean(articleId),
      staleTime: 30_000,
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

export type { CreateArticleInput, SyncArticleTagsInput, UpdateArticleInput };
