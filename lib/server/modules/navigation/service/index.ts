import "server-only";

import { ApiError } from "@/lib/server/http/api-error";
import { navigationRepository } from "@/lib/server/modules/navigation/repository";
import {
  navigationItemsDocumentSchema,
  navigationMenuKeySchema,
  type NavigationItem,
  type NavigationItemsDocument,
  type NavigationMenuKey,
  type NavigationOptionsInput,
  type UpdateNavigationMenuInput,
} from "@/lib/server/modules/navigation/schema";

import type {
  NavigationMenuDto,
  NavigationOptionDto,
  PublicNavigationDto,
  PublicNavigationItemDto,
} from "@/lib/server/modules/navigation/dto";

type MenuRecord = {
  id: string;
  key: string;
  label: string;
  items: unknown;
  updatedAt: Date;
};

const menuLabels = {
  main: "Menu principale",
  footer_sections: "Footer sezioni",
  footer_legal: "Footer legale",
} satisfies Record<NavigationMenuKey, string>;

const fallbackDocuments = {
  main: {
    version: 1,
    items: [
      { id: "main-home", type: "home", label: "Numero corrente" },
      { id: "main-archive", type: "archive", label: "Archivio" },
      { id: "main-about", type: "custom", label: "Chi siamo", href: "/chi-siamo" },
    ],
  },
  footer_sections: {
    version: 1,
    items: [
      { id: "footer-sections-home", type: "home", label: "Numero corrente" },
      { id: "footer-sections-archive", type: "archive", label: "Archivio" },
      { id: "footer-sections-about", type: "custom", label: "Chi siamo", href: "/chi-siamo" },
    ],
  },
  footer_legal: {
    version: 1,
    items: [
      {
        id: "footer-legal-privacy",
        type: "custom",
        label: "Privacy policy",
        href: "/privacy-policy",
      },
      { id: "footer-legal-cookie", type: "custom", label: "Cookie policy", href: "/cookie-policy" },
    ],
  },
} satisfies Record<NavigationMenuKey, NavigationItemsDocument>;

function parseItems(value: unknown, fallback: NavigationItemsDocument): NavigationItemsDocument {
  const parsed = navigationItemsDocumentSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

function toMenuDto(record: MenuRecord): NavigationMenuDto {
  const key = navigationMenuKeySchema.parse(record.key);
  return {
    id: record.id,
    key,
    label: record.label,
    items: parseItems(record.items, fallbackDocuments[key]).items,
    updatedAt: record.updatedAt.toISOString(),
  };
}

function assertSafeCustomHref(href: string) {
  if (href.startsWith("/") || href.startsWith("#")) {
    return;
  }

  try {
    const url = new URL(href);
    if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
      return;
    }
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid navigation URL");
  }

  throw new ApiError(400, "VALIDATION_ERROR", "Invalid navigation URL");
}

function validateItems(items: NavigationItem[]) {
  const ids = new Set<string>();

  for (const item of items) {
    if (ids.has(item.id)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Navigation item IDs must be unique");
    }

    ids.add(item.id);

    if (item.type === "custom") {
      assertSafeCustomHref(item.href);
    }
  }
}

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

function toPublicItem(item: NavigationItem, href: string): PublicNavigationItemDto {
  return { id: item.id, label: item.label, href, external: isExternalHref(href) };
}

async function resolvePublicItems(items: NavigationItem[]): Promise<PublicNavigationItemDto[]> {
  const pageIds = items.filter((item) => item.type === "page").map((item) => item.resourceId);
  const articleIds = items.filter((item) => item.type === "article").map((item) => item.resourceId);
  const issueIds = items.filter((item) => item.type === "issue").map((item) => item.resourceId);

  const [pages, articles, issues] = await Promise.all([
    navigationRepository.findPublishedPagesByIds(pageIds),
    navigationRepository.findPublishedArticlesByIds(articleIds),
    navigationRepository.findPublishedIssuesByIds(issueIds),
  ]);

  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const articlesById = new Map(articles.map((article) => [article.id, article]));
  const issuesById = new Map(issues.map((issue) => [issue.id, issue]));
  const resolved: PublicNavigationItemDto[] = [];

  for (const item of items) {
    if (item.type === "home") resolved.push(toPublicItem(item, "/"));
    if (item.type === "archive") resolved.push(toPublicItem(item, "/uscite"));
    if (item.type === "custom") resolved.push(toPublicItem(item, item.href));
    if (item.type === "page") {
      const page = pagesById.get(item.resourceId);
      if (page) resolved.push(toPublicItem(item, `/${page.slug}`));
    }
    if (item.type === "article") {
      const article = articlesById.get(item.resourceId);
      if (article) resolved.push(toPublicItem(item, `/articoli/${article.slug}`));
    }
    if (item.type === "issue") {
      const issue = issuesById.get(item.resourceId);
      if (issue) resolved.push(toPublicItem(item, `/uscite/${issue.slug}`));
    }
  }

  return resolved;
}

function resolveFallbackPublicItems(items: NavigationItem[]): PublicNavigationItemDto[] {
  const resolved: PublicNavigationItemDto[] = [];

  for (const item of items) {
    if (item.type === "home") resolved.push(toPublicItem(item, "/"));
    if (item.type === "archive") resolved.push(toPublicItem(item, "/uscite"));
    if (item.type === "custom") resolved.push(toPublicItem(item, item.href));
  }

  return resolved;
}

function getFallbackPublicNavigation(): PublicNavigationDto {
  return {
    main: resolveFallbackPublicItems(fallbackDocuments.main.items),
    footerSections: resolveFallbackPublicItems(fallbackDocuments.footer_sections.items),
    footerLegal: resolveFallbackPublicItems(fallbackDocuments.footer_legal.items),
  };
}

function toOptionDto(input: {
  id: string;
  title: string;
  slug: string;
  publishedAt?: Date | null;
  updatedAt?: Date;
}): NavigationOptionDto {
  const date = input.publishedAt ?? input.updatedAt ?? null;
  return {
    id: input.id,
    label: input.title,
    href: `/${input.slug}`,
    meta: date ? date.toISOString() : null,
  };
}

async function ensureMenus() {
  const existing = await navigationRepository.listMenus();
  const existingKeys = new Set(existing.map((menu) => menu.key));

  await Promise.all(
    navigationMenuKeySchema.options
      .filter((key) => !existingKeys.has(key))
      .map((key) => navigationRepository.upsertMenu(key, menuLabels[key], fallbackDocuments[key])),
  );
}

export const navigationService = {
  async listMenus() {
    await ensureMenus();
    const menus = await navigationRepository.listMenus();
    return menus.map((menu) => toMenuDto(menu));
  },
  async update(input: UpdateNavigationMenuInput) {
    validateItems(input.items);
    const menu = await navigationRepository.upsertMenu(input.key, menuLabels[input.key], {
      version: 1,
      items: input.items,
    });
    return toMenuDto(menu);
  },
  async listOptions(input: NavigationOptionsInput) {
    if (input.type === "page") {
      const pages = await navigationRepository.listPublishedPages(input.q);
      return pages.map((page) => ({ ...toOptionDto(page), href: `/${page.slug}` }));
    }

    if (input.type === "article") {
      const articles = await navigationRepository.listPublishedArticles(input.q);
      return articles.map((article) => ({
        ...toOptionDto(article),
        href: `/articoli/${article.slug}`,
      }));
    }

    const issues = await navigationRepository.listPublishedIssues(input.q);
    return issues.map((issue) => ({ ...toOptionDto(issue), href: `/uscite/${issue.slug}` }));
  },
  async getPublicNavigation(): Promise<PublicNavigationDto> {
    await ensureMenus();
    const menus = await navigationRepository.listMenus();
    const byKey = new Map(menus.map((menu) => [menu.key, menu]));

    const main = parseItems(byKey.get("main")?.items, fallbackDocuments.main).items;
    const footerSections = parseItems(
      byKey.get("footer_sections")?.items,
      fallbackDocuments.footer_sections,
    ).items;
    const footerLegal = parseItems(
      byKey.get("footer_legal")?.items,
      fallbackDocuments.footer_legal,
    ).items;

    return {
      main: await resolvePublicItems(main),
      footerSections: await resolvePublicItems(footerSections),
      footerLegal: await resolvePublicItems(footerLegal),
    };
  },
  getFallbackPublicNavigation,
};
