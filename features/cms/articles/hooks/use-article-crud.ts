"use client";

import { cmsOptionsQueryOptions } from "@/features/cms/shared/hooks";
import {
  articleAuthorOptionsInput,
  articleCategoryOptionsInput,
  articleIssueOptionsInput,
  articleTagOptionsInput,
} from "@/lib/cms/article-options";
import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CreateArticleInput = RouterInputs["articles"]["create"];
type UpdateArticleInput = RouterInputs["articles"]["update"]["data"];
type SyncArticleTagsInput = RouterInputs["articles"]["syncTags"]["data"];
type ArticleDetail = RouterOutputs["articles"]["getById"];
type TagOptionsOutput = RouterOutputs["tags"]["list"];
type IssueOptionsOutput = RouterOutputs["issues"]["list"];
type CategoryOptionsOutput = RouterOutputs["categories"]["list"];
type UserOptionsOutput = RouterOutputs["users"]["listAuthors"];

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

export function useTagOptions(options?: { initialData?: TagOptionsOutput }) {
  return trpc.tags.list.useQuery(articleTagOptionsInput, {
    ...cmsOptionsQueryOptions,
    initialData: options?.initialData,
  });
}

export function useIssueOptions(options?: { initialData?: IssueOptionsOutput }) {
  return trpc.issues.list.useQuery(articleIssueOptionsInput, {
    ...cmsOptionsQueryOptions,
    initialData: options?.initialData,
  });
}

export function useCategoryOptions(options?: { initialData?: CategoryOptionsOutput }) {
  return trpc.categories.list.useQuery(articleCategoryOptionsInput, {
    ...cmsOptionsQueryOptions,
    initialData: options?.initialData,
  });
}

export function useUserOptions(options?: { initialData?: UserOptionsOutput }) {
  return trpc.users.listAuthors.useQuery(articleAuthorOptionsInput, {
    ...cmsOptionsQueryOptions,
    initialData: options?.initialData,
  });
}

export type { ArticleDetail, CreateArticleInput, SyncArticleTagsInput, UpdateArticleInput };
