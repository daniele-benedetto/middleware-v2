"use client";

import { cmsOptionsQueryOptions } from "@/features/cms/shared/hooks";
import {
  articleAuthorOptionsInput,
  articleCategoryOptionsInput,
  articleIssueOptionsInput,
} from "@/lib/cms/article-options";
import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CreateArticleInput = RouterInputs["articles"]["create"];
type UpdateArticleInput = RouterInputs["articles"]["update"]["data"];
type ArticleDetail = RouterOutputs["articles"]["getById"];
type IssueOptionsOutput = RouterOutputs["issues"]["list"];
type CategoryOptionsOutput = RouterOutputs["categories"]["list"];
type AuthorOptionsOutput = RouterOutputs["authors"]["list"];

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

export function useAuthorOptions(options?: { initialData?: AuthorOptionsOutput }) {
  return trpc.authors.list.useQuery(articleAuthorOptionsInput, {
    ...cmsOptionsQueryOptions,
    initialData: options?.initialData,
  });
}

export type { ArticleDetail, CreateArticleInput, UpdateArticleInput };
