import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type {
  NavigationItemsDocument,
  NavigationMenuKey,
} from "@/lib/server/modules/navigation/schema";

const NAVIGATION_MENU_SELECT = {
  id: true,
  key: true,
  label: true,
  items: true,
  updatedAt: true,
} as const satisfies Prisma.NavigationMenuSelect;

export const navigationRepository = {
  async listMenus() {
    return prisma.navigationMenu.findMany({
      orderBy: { key: "asc" },
      select: NAVIGATION_MENU_SELECT,
    });
  },
  async getByKey(key: NavigationMenuKey) {
    return prisma.navigationMenu.findUnique({
      where: { key },
      select: NAVIGATION_MENU_SELECT,
    });
  },
  async upsertMenu(key: NavigationMenuKey, label: string, items: NavigationItemsDocument) {
    return prisma.navigationMenu.upsert({
      where: { key },
      create: {
        key,
        label,
        items: items as Prisma.InputJsonValue,
      },
      update: {
        items: items as Prisma.InputJsonValue,
      },
      select: NAVIGATION_MENU_SELECT,
    });
  },
  async listPublishedPages(q?: string) {
    return prisma.page.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
        OR: q
          ? [
              { title: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { title: "asc" },
      take: 50,
      select: { id: true, title: true, slug: true, updatedAt: true },
    });
  },
  async listPublishedArticles(q?: string) {
    return prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
        issue: { isActive: true, publishedAt: { not: null } },
        OR: q
          ? [
              { title: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: { id: true, title: true, slug: true, publishedAt: true },
    });
  },
  async listPublishedIssues(q?: string) {
    return prisma.issue.findMany({
      where: {
        isActive: true,
        publishedAt: { not: null },
        OR: q
          ? [
              { title: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
      take: 50,
      select: { id: true, title: true, slug: true, publishedAt: true },
    });
  },
  async listPublishedCourses(q?: string) {
    return prisma.course.findMany({
      where: {
        isActive: true,
        publishedAt: { not: null },
        OR: q
          ? [
              { title: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
      take: 50,
      select: { id: true, title: true, slug: true, publishedAt: true },
    });
  },
  async findPublishedCoursesByIds(ids: string[]) {
    return prisma.course.findMany({
      where: { id: { in: ids }, isActive: true, publishedAt: { not: null } },
      select: { id: true, slug: true },
    });
  },
  async findPublishedPagesByIds(ids: string[]) {
    return prisma.page.findMany({
      where: { id: { in: ids }, status: "PUBLISHED", publishedAt: { not: null } },
      select: { id: true, slug: true },
    });
  },
  async findPublishedArticlesByIds(ids: string[]) {
    return prisma.article.findMany({
      where: {
        id: { in: ids },
        status: "PUBLISHED",
        publishedAt: { not: null },
        issue: { isActive: true, publishedAt: { not: null } },
      },
      select: { id: true, slug: true },
    });
  },
  async findPublishedIssuesByIds(ids: string[]) {
    return prisma.issue.findMany({
      where: { id: { in: ids }, isActive: true, publishedAt: { not: null } },
      select: { id: true, slug: true },
    });
  },
};
