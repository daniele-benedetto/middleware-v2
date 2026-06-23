import "server-only";

import { unstable_cache } from "next/cache";

import { getPublicStaticPagePath, isPublicStaticPageSlug } from "@/lib/public/pages/static-pages";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { publicPagesService } from "@/lib/server/modules/pages/service/public";

import type { PublicStaticPageSlug } from "@/lib/public/pages/static-pages";
import type { PublicPageDto } from "@/lib/server/modules/pages/dto/public";

export const PUBLIC_PAGE_REVALIDATE_SECONDS = 60 * 60;
export const PUBLIC_PAGE_CACHE_TAG = "public-page";

export type PublicStaticPageData = {
  page: PublicPageDto | null;
  description?: string;
  canonicalPath: string;
};

async function getPageBySlug(slug: PublicStaticPageSlug) {
  try {
    return await publicPagesService.getBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      return null;
    }

    console.error("public.getPublicStaticPageData page failed", { slug, error });
    return null;
  }
}

async function loadPublicStaticPageData(slug: string): Promise<PublicStaticPageData> {
  if (!isPublicStaticPageSlug(slug)) {
    return { page: null, canonicalPath: `/${slug}` };
  }

  const page = await getPageBySlug(slug);

  return {
    page,
    description: page ? page.excerpt || extractPlainText(page.contentRich) || undefined : undefined,
    canonicalPath: getPublicStaticPagePath(slug),
  };
}

export const getPublicStaticPageData = unstable_cache(
  loadPublicStaticPageData,
  ["public-static-page-data"],
  {
    revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
    tags: [PUBLIC_PAGE_CACHE_TAG],
  },
);
