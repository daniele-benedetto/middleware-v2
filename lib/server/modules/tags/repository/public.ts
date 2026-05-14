import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PUBLIC_ARTICLE_TAG_WHERE = {
  article: {
    status: "PUBLISHED",
    publishedAt: { not: null },
    issue: { isActive: true, publishedAt: { not: null } },
  },
} as const satisfies Prisma.ArticleTagWhereInput;

const PUBLIC_TAG_SELECT = {
  id: true,
  name: true,
  slug: true,
  _count: {
    select: {
      articles: { where: PUBLIC_ARTICLE_TAG_WHERE },
    },
  },
} as const satisfies Prisma.TagSelect;

export const publicTagsRepository = {
  async list() {
    return prisma.tag.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: PUBLIC_TAG_SELECT,
    });
  },
  async getBySlug(slug: string) {
    return prisma.tag.findFirst({
      where: { slug, isActive: true },
      select: PUBLIC_TAG_SELECT,
    });
  },
};
