import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PUBLIC_ISSUE_WHERE = {
  isActive: true,
  publishedAt: { not: null },
} as const satisfies Prisma.IssueWhereInput;

const PUBLIC_ARTICLE_MEDIA_WHERE = {
  status: "PUBLISHED",
  publishedAt: { not: null },
  issue: PUBLIC_ISSUE_WHERE,
} as const satisfies Prisma.ArticleWhereInput;

const PUBLIC_PAGE_WHERE = {
  status: "PUBLISHED",
  publishedAt: { not: null },
} as const satisfies Prisma.PageWhereInput;

export const publicMediaRepository = {
  async listPublishedArticleMediaUrls() {
    return prisma.article.findMany({
      where: {
        ...PUBLIC_ARTICLE_MEDIA_WHERE,
        OR: [{ imageUrl: { not: null } }, { audioUrl: { not: null } }],
      },
      select: { imageUrl: true, audioUrl: true },
    });
  },
  async listPublishedPageContent() {
    return prisma.page.findMany({
      where: PUBLIC_PAGE_WHERE,
      select: { contentRich: true },
    });
  },
};
