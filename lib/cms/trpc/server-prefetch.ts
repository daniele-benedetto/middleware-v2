import "server-only";

import {
  articleAuthorOptionsInput,
  articleCategoryOptionsInput,
  articleIssueOptionsInput,
  articleTagOptionsInput,
} from "@/lib/cms/article-options";
import { getTrpcCaller } from "@/lib/server/trpc/caller";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type TrpcCaller = Awaited<ReturnType<typeof getTrpcCaller>>;

type IssuesListInput = RouterInputs["issues"]["list"];
type CategoriesListInput = RouterInputs["categories"]["list"];
type TagsListInput = RouterInputs["tags"]["list"];
type ArticlesListInput = RouterInputs["articles"]["list"];
type UsersListInput = RouterInputs["users"]["list"];
type MediaListOutput = RouterOutputs["media"]["list"];

type IssuesListOutput = RouterOutputs["issues"]["list"];
type CategoriesListOutput = RouterOutputs["categories"]["list"];
type TagsListOutput = RouterOutputs["tags"]["list"];
type ArticlesListOutput = RouterOutputs["articles"]["list"];
type UsersListOutput = RouterOutputs["users"]["list"];

type IssueDetailOutput = RouterOutputs["issues"]["getById"];
type CategoryDetailOutput = RouterOutputs["categories"]["getById"];
type TagDetailOutput = RouterOutputs["tags"]["getById"];
type UserDetailOutput = RouterOutputs["users"]["getById"];
type ArticleDetailOutput = RouterOutputs["articles"]["getById"];
type UsersAuthorOptionsOutput = RouterOutputs["users"]["listAuthors"];

type CmsListPrefetcher<TInput, TOutput> = (caller: TrpcCaller, input: TInput) => Promise<TOutput>;

async function prefetchCmsList<TInput, TOutput>(
  input: TInput,
  prefetcher: CmsListPrefetcher<TInput, TOutput>,
): Promise<TOutput> {
  const caller = await getTrpcCaller();
  return prefetcher(caller, input);
}

export async function prefetchIssuesList(input: IssuesListInput): Promise<IssuesListOutput> {
  return prefetchCmsList(input, (caller, listInput) => caller.issues.list(listInput));
}

export async function prefetchCategoriesList(
  input: CategoriesListInput,
): Promise<CategoriesListOutput> {
  return prefetchCmsList(input, (caller, listInput) => caller.categories.list(listInput));
}

export async function prefetchTagsList(input: TagsListInput): Promise<TagsListOutput> {
  return prefetchCmsList(input, (caller, listInput) => caller.tags.list(listInput));
}

export async function prefetchArticlesList(input: ArticlesListInput): Promise<ArticlesListOutput> {
  return prefetchCmsList(input, (caller, listInput) => caller.articles.list(listInput));
}

export async function prefetchUsersList(input: UsersListInput): Promise<UsersListOutput> {
  return prefetchCmsList(input, (caller, listInput) => caller.users.list(listInput));
}

export async function prefetchMediaList(): Promise<MediaListOutput> {
  const caller = await getTrpcCaller();
  return caller.media.list();
}

export async function prefetchIssueById(id: string): Promise<IssueDetailOutput> {
  const caller = await getTrpcCaller();
  return caller.issues.getById({ id });
}

export async function prefetchCategoryById(id: string): Promise<CategoryDetailOutput> {
  const caller = await getTrpcCaller();
  return caller.categories.getById({ id });
}

export async function prefetchTagById(id: string): Promise<TagDetailOutput> {
  const caller = await getTrpcCaller();
  return caller.tags.getById({ id });
}

export async function prefetchUserById(id: string): Promise<UserDetailOutput> {
  const caller = await getTrpcCaller();
  return caller.users.getById({ id });
}

export async function prefetchArticleById(id: string): Promise<ArticleDetailOutput> {
  const caller = await getTrpcCaller();
  return caller.articles.getById({ id });
}

export async function prefetchArticleFormOptions(): Promise<{
  tagsOptions: TagsListOutput;
  issuesOptions: IssuesListOutput;
  categoriesOptions: CategoriesListOutput;
  authorsOptions: UsersAuthorOptionsOutput;
}> {
  const caller = await getTrpcCaller();

  const [tagsOptions, issuesOptions, categoriesOptions, authorsOptions] = await Promise.all([
    caller.tags.list(articleTagOptionsInput),
    caller.issues.list(articleIssueOptionsInput),
    caller.categories.list(articleCategoryOptionsInput),
    caller.users.listAuthors(articleAuthorOptionsInput),
  ]);

  return {
    tagsOptions,
    issuesOptions,
    categoriesOptions,
    authorsOptions,
  };
}

export async function prefetchArticlesListWithFilterOptions(input: ArticlesListInput): Promise<{
  articles: ArticlesListOutput;
  issuesOptions: IssuesListOutput;
  categoriesOptions: CategoriesListOutput;
  authorsOptions: UsersAuthorOptionsOutput;
}> {
  const caller = await getTrpcCaller();

  const [articles, issuesOptions, categoriesOptions, authorsOptions] = await Promise.all([
    caller.articles.list(input),
    caller.issues.list(articleIssueOptionsInput),
    caller.categories.list(articleCategoryOptionsInput),
    caller.users.listAuthors(articleAuthorOptionsInput),
  ]);

  return {
    articles,
    issuesOptions,
    categoriesOptions,
    authorsOptions,
  };
}
