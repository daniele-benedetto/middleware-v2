import "server-only";

import { publicArticlesService } from "@/lib/server/modules/articles/service/public";

import type { PublicArticleSummaryDto } from "@/lib/server/modules/articles/dto/public";

export const PUBLIC_ARTICLES_ARCHIVE_CACHE_TAG = "public-articles-archive";

export type PublicArticlesArchiveData = {
  articles: PublicArticleSummaryDto[];
};

export async function getPublicArticlesArchiveData(): Promise<PublicArticlesArchiveData> {
  try {
    const articles = await publicArticlesService.listPublished();
    return { articles };
  } catch (error) {
    console.error("public.getPublicArticlesArchiveData published articles failed", error);
    throw error;
  }
}
