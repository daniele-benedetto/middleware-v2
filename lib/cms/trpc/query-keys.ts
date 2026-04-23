import type { RouterInputs } from "@/lib/trpc/types";

type UsersListInput = RouterInputs["users"]["list"];
type IssuesListInput = RouterInputs["issues"]["list"];
type CategoriesListInput = RouterInputs["categories"]["list"];
type TagsListInput = RouterInputs["tags"]["list"];
type ArticlesListInput = RouterInputs["articles"]["list"];

export const cmsQueryKeys = {
  users: {
    all: () => ["users"] as const,
    lists: () => ["users", "lists"] as const,
    list: (input: UsersListInput) => ["users", "lists", input] as const,
    details: () => ["users", "details"] as const,
    detail: (id: string) => ["users", "details", id] as const,
  },
  issues: {
    all: () => ["issues"] as const,
    lists: () => ["issues", "lists"] as const,
    list: (input: IssuesListInput) => ["issues", "lists", input] as const,
    details: () => ["issues", "details"] as const,
    detail: (id: string) => ["issues", "details", id] as const,
  },
  categories: {
    all: () => ["categories"] as const,
    lists: () => ["categories", "lists"] as const,
    list: (input: CategoriesListInput) => ["categories", "lists", input] as const,
    details: () => ["categories", "details"] as const,
    detail: (id: string) => ["categories", "details", id] as const,
  },
  tags: {
    all: () => ["tags"] as const,
    lists: () => ["tags", "lists"] as const,
    list: (input: TagsListInput) => ["tags", "lists", input] as const,
    details: () => ["tags", "details"] as const,
    detail: (id: string) => ["tags", "details", id] as const,
  },
  articles: {
    all: () => ["articles"] as const,
    lists: () => ["articles", "lists"] as const,
    list: (input: ArticlesListInput) => ["articles", "lists", input] as const,
    details: () => ["articles", "details"] as const,
    detail: (id: string) => ["articles", "details", id] as const,
  },
} as const;
