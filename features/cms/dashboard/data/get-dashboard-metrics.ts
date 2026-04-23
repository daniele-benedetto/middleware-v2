import "server-only";

import { articlesService } from "@/lib/server/modules/articles/service";
import { categoriesService } from "@/lib/server/modules/categories/service";
import { issuesService } from "@/lib/server/modules/issues/service";
import { tagsService } from "@/lib/server/modules/tags/service";

const countPagination = {
  page: 1,
  pageSize: 1,
} as const;

const issuesQueryDefaults = {
  sortBy: "createdAt",
  sortOrder: "desc",
} as const;

const categoriesQueryDefaults = {
  sortBy: "createdAt",
  sortOrder: "desc",
} as const;

const tagsQueryDefaults = {
  sortBy: "createdAt",
  sortOrder: "desc",
} as const;

const articlesQueryDefaults = {
  sortBy: "createdAt",
  sortOrder: "desc",
} as const;

export type CmsDashboardMetrics = {
  issuesTotal: number;
  issuesActive: number;
  issuesPublished: number;
  categoriesTotal: number;
  tagsTotal: number;
  articlesTotal: number;
  articlesDraft: number;
  articlesPublished: number;
  articlesArchived: number;
  articlesFeatured: number;
};

export async function getCmsDashboardMetrics(): Promise<CmsDashboardMetrics> {
  const [
    issuesTotal,
    issuesActive,
    issuesPublished,
    categoriesTotal,
    tagsTotal,
    articlesTotal,
    articlesDraft,
    articlesPublished,
    articlesArchived,
    articlesFeatured,
  ] = await Promise.all([
    issuesService.list(issuesQueryDefaults, countPagination),
    issuesService.list({ ...issuesQueryDefaults, isActive: true }, countPagination),
    issuesService.list({ ...issuesQueryDefaults, published: true }, countPagination),
    categoriesService.list(categoriesQueryDefaults, countPagination),
    tagsService.list(tagsQueryDefaults, countPagination),
    articlesService.list(articlesQueryDefaults, countPagination),
    articlesService.list({ ...articlesQueryDefaults, status: "DRAFT" }, countPagination),
    articlesService.list({ ...articlesQueryDefaults, status: "PUBLISHED" }, countPagination),
    articlesService.list({ ...articlesQueryDefaults, status: "ARCHIVED" }, countPagination),
    articlesService.list({ ...articlesQueryDefaults, featured: true }, countPagination),
  ]);

  return {
    issuesTotal: issuesTotal.total,
    issuesActive: issuesActive.total,
    issuesPublished: issuesPublished.total,
    categoriesTotal: categoriesTotal.total,
    tagsTotal: tagsTotal.total,
    articlesTotal: articlesTotal.total,
    articlesDraft: articlesDraft.total,
    articlesPublished: articlesPublished.total,
    articlesArchived: articlesArchived.total,
    articlesFeatured: articlesFeatured.total,
  };
}
