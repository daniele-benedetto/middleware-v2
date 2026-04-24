import type { RouterOutputs } from "@/lib/trpc/types";

export type InitialCmsListData<TItem> = {
  items: TItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export type IssuesListInitialData = RouterOutputs["issues"]["list"];
export type CategoriesListInitialData = RouterOutputs["categories"]["list"];
export type TagsListInitialData = RouterOutputs["tags"]["list"];
export type ArticlesListInitialData = RouterOutputs["articles"]["list"];
export type UsersListInitialData = RouterOutputs["users"]["list"];
