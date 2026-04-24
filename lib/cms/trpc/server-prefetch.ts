import "server-only";

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

export async function prefetchArticlesListWithFilterOptions(input: ArticlesListInput): Promise<{
  articles: ArticlesListOutput;
  issuesOptions: IssuesListOutput;
  categoriesOptions: CategoriesListOutput;
}> {
  const caller = await getTrpcCaller();

  const issuesOptionsInput: IssuesListInput = {
    page: 1,
    pageSize: 100,
    query: {
      sortBy: "sortOrder",
      sortOrder: "asc",
    },
  };

  const categoriesOptionsInput: CategoriesListInput = {
    page: 1,
    pageSize: 100,
    query: {
      sortBy: "name",
      sortOrder: "asc",
    },
  };

  const [articles, issuesOptions, categoriesOptions] = await Promise.all([
    caller.articles.list(input),
    caller.issues.list(issuesOptionsInput),
    caller.categories.list(categoriesOptionsInput),
  ]);

  return {
    articles,
    issuesOptions,
    categoriesOptions,
  };
}
