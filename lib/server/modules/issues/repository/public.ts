import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";

const PUBLISHED_ARTICLE_WHERE = {
  status: "PUBLISHED",
  publishedAt: { not: null },
} as const satisfies Prisma.ArticleWhereInput;

const PUBLIC_ISSUE_LIST_SELECT = {
  id: true,
  title: true,
  titleStyled: true,
  slug: true,
  description: true,
  homeLayout: true,
  publishedAt: true,
  _count: {
    select: {
      articles: { where: PUBLISHED_ARTICLE_WHERE },
    },
  },
} as const satisfies Prisma.IssueSelect;

const PUBLIC_ISSUE_DETAIL_ARTICLE_SELECT = {
  id: true,
  slug: true,
  title: true,
  titleStyled: true,
  excerpt: true,
  imageUrl: true,
  audioUrl: true,
  isFeatured: true,
  position: true,
  contentRich: true,
  publishedAt: true,
  category: {
    select: { slug: true, name: true },
  },
  author: {
    select: { name: true },
  },
} as const satisfies Prisma.ArticleSelect;

const PUBLIC_ISSUE_DETAIL_SELECT = {
  ...PUBLIC_ISSUE_LIST_SELECT,
  articles: {
    where: PUBLISHED_ARTICLE_WHERE,
    orderBy: [{ position: "asc" }, { publishedAt: "asc" }],
    select: PUBLIC_ISSUE_DETAIL_ARTICLE_SELECT,
  },
} as const satisfies Prisma.IssueSelect;

const PUBLIC_ISSUE_WHERE = {
  isActive: true,
  publishedAt: { not: null },
} as const satisfies Prisma.IssueWhereInput;

export const publicIssuesRepository = {
  async listPublished(pagination: PaginationParams) {
    return prisma.issue.findMany({
      where: PUBLIC_ISSUE_WHERE,
      orderBy: { publishedAt: "desc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: PUBLIC_ISSUE_LIST_SELECT,
    });
  },
  async countPublished() {
    return prisma.issue.count({ where: PUBLIC_ISSUE_WHERE });
  },
  async getCurrent() {
    return prisma.issue.findFirst({
      where: PUBLIC_ISSUE_WHERE,
      orderBy: { publishedAt: "desc" },
      select: PUBLIC_ISSUE_DETAIL_SELECT,
    });
  },
  async getBySlug(slug: string) {
    return prisma.issue.findFirst({
      where: { ...PUBLIC_ISSUE_WHERE, slug },
      select: PUBLIC_ISSUE_DETAIL_SELECT,
    });
  },
};
