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
export type CoursesListInitialData = RouterOutputs["courses"]["list"];
export type LessonsListInitialData = RouterOutputs["lessons"]["list"];
export type CategoriesListInitialData = RouterOutputs["categories"]["list"];
export type ArticlesListInitialData = RouterOutputs["articles"]["list"];
export type AuthorsListInitialData = RouterOutputs["authors"]["list"];
export type AuditLogsListInitialData = RouterOutputs["auditLogs"]["list"];
export type UsersListInitialData = RouterOutputs["users"]["list"];
