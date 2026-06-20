import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PUBLIC_ISSUE_WHERE = {
  isActive: true,
  publishedAt: { not: null },
} as const satisfies Prisma.IssueWhereInput;

const PUBLIC_ARTICLE_WHERE = {
  status: "PUBLISHED",
  publishedAt: { not: null },
  issue: PUBLIC_ISSUE_WHERE,
} as const satisfies Prisma.ArticleWhereInput;

const PUBLIC_ARTICLE_SUMMARY_SELECT = {
  id: true,
  slug: true,
  title: true,
  titleStyled: true,
  excerpt: true,
  imageUrl: true,
  audioUrl: true,
  isFeatured: true,
  publishedAt: true,
  issueId: true,
  categoryId: true,
  authorId: true,
  issue: {
    select: { slug: true, title: true },
  },
  category: {
    select: { slug: true, name: true },
  },
  author: {
    select: { name: true },
  },
  _count: {
    select: { tags: true },
  },
} as const satisfies Prisma.ArticleSelect;

const PUBLIC_ARTICLE_DETAIL_SELECT = {
  ...PUBLIC_ARTICLE_SUMMARY_SELECT,
  updatedAt: true,
  excerptRich: true,
  contentRich: true,
  audioChunks: true,
  tags: {
    select: {
      tag: {
        select: { id: true, slug: true, name: true },
      },
    },
  },
} as const satisfies Prisma.ArticleSelect;

export const publicArticlesRepository = {
  async getBySlug(slug: string) {
    return prisma.article.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
        publishedAt: { not: null },
        issue: PUBLIC_ISSUE_WHERE,
      },
      select: PUBLIC_ARTICLE_DETAIL_SELECT,
    });
  },
  async listPublished() {
    return prisma.article.findMany({
      where: PUBLIC_ARTICLE_WHERE,
      orderBy: { publishedAt: "desc" },
      select: PUBLIC_ARTICLE_SUMMARY_SELECT,
    });
  },
  async listWithAudio() {
    return prisma.article.findMany({
      where: { ...PUBLIC_ARTICLE_WHERE, audioUrl: { not: null } },
      orderBy: { publishedAt: "desc" },
      select: PUBLIC_ARTICLE_SUMMARY_SELECT,
    });
  },
  async listByIssueSlug(issueSlug: string) {
    return prisma.article.findMany({
      where: {
        ...PUBLIC_ARTICLE_WHERE,
        issue: { ...PUBLIC_ISSUE_WHERE, slug: issueSlug },
      },
      orderBy: [{ position: "asc" }, { publishedAt: "asc" }],
      select: PUBLIC_ARTICLE_SUMMARY_SELECT,
    });
  },
  async listByCategorySlug(categorySlug: string) {
    return prisma.article.findMany({
      where: {
        ...PUBLIC_ARTICLE_WHERE,
        category: { slug: categorySlug, isActive: true },
      },
      orderBy: { publishedAt: "desc" },
      select: PUBLIC_ARTICLE_SUMMARY_SELECT,
    });
  },
  async listByTagSlug(tagSlug: string) {
    return prisma.article.findMany({
      where: {
        ...PUBLIC_ARTICLE_WHERE,
        tags: { some: { tag: { slug: tagSlug, isActive: true } } },
      },
      orderBy: { publishedAt: "desc" },
      select: PUBLIC_ARTICLE_SUMMARY_SELECT,
    });
  },
  async listFeatured(limit: number) {
    return prisma.article.findMany({
      where: { ...PUBLIC_ARTICLE_WHERE, isFeatured: true },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: PUBLIC_ARTICLE_SUMMARY_SELECT,
    });
  },
  async search(query: string, limit: number) {
    return prisma.article.findMany({
      where: {
        ...PUBLIC_ARTICLE_WHERE,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { excerpt: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: PUBLIC_ARTICLE_SUMMARY_SELECT,
    });
  },
};
