import "server-only";

import {
  articleAuthorOptionsInput,
  articleCategoryOptionsInput,
  articleIssueOptionsInput,
  articleTagOptionsInput,
} from "@/features/cms/articles/lib/article-option-inputs";
import { getTrpcCaller } from "@/lib/server/trpc/caller";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

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

type IssueDetailOutput = RouterOutputs["issues"]["getById"];
type CategoryDetailOutput = RouterOutputs["categories"]["getById"];
type TagDetailOutput = RouterOutputs["tags"]["getById"];
type UserDetailOutput = RouterOutputs["users"]["getById"];
type ArticleDetailOutput = RouterOutputs["articles"]["getById"];
type UsersAuthorOptionsOutput = RouterOutputs["users"]["listAuthors"];

export async function prefetchIssuesList(input: IssuesListInput): Promise<IssuesListOutput> {
  const caller = await getTrpcCaller();
  return caller.issues.list(input);
}

export async function prefetchCategoriesList(
  input: CategoriesListInput,
): Promise<CategoriesListOutput> {
  const caller = await getTrpcCaller();
  return caller.categories.list(input);
}

export async function prefetchTagsList(input: TagsListInput): Promise<TagsListOutput> {
  const caller = await getTrpcCaller();
  return caller.tags.list(input);
}

export async function prefetchArticlesList(input: ArticlesListInput): Promise<ArticlesListOutput> {
  const caller = await getTrpcCaller();
  return caller.articles.list(input);
}

export async function prefetchUsersList(input: UsersListInput): Promise<UsersListOutput> {
  const caller = await getTrpcCaller();
  return caller.users.list(input);
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
