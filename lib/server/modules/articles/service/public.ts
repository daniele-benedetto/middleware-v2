import "server-only";

import { ApiError } from "@/lib/server/http/api-error";
import { publicArticlesRepository } from "@/lib/server/modules/articles/repository/public";

import type {
  PublicArticleDetailDto,
  PublicArticleSummaryDto,
} from "@/lib/server/modules/articles/dto/public";

type PublicArticleSummaryRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  isFeatured: boolean;
  publishedAt: Date | null;
  issueId: string;
  categoryId: string;
  authorId: string;
  issue?: { slug: string; title: string } | null;
  category?: { slug: string; name: string } | null;
  author?: { name: string | null } | null;
  _count?: { tags: number };
};

type PublicArticleDetailRecord = PublicArticleSummaryRecord & {
  updatedAt: Date;
  excerptRich: unknown;
  contentRich: unknown;
  audioChunks: unknown;
  tags?: Array<{ tag: { id: string; slug: string; name: string } }>;
};

const toPublicArticleSummaryDto = (
  article: PublicArticleSummaryRecord,
): PublicArticleSummaryDto => {
  if (!article.publishedAt) {
    throw new ApiError(500, "INTERNAL_ERROR", "Public article missing publishedAt");
  }

  if (!article.issue || !article.category) {
    throw new ApiError(500, "INTERNAL_ERROR", "Public article missing required relations");
  }

  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    imageUrl: article.imageUrl,
    hasAudio: Boolean(article.audioUrl),
    isFeatured: article.isFeatured,
    publishedAt: article.publishedAt.toISOString(),
    issueId: article.issueId,
    issueSlug: article.issue.slug,
    issueTitle: article.issue.title,
    categoryId: article.categoryId,
    categorySlug: article.category.slug,
    categoryName: article.category.name,
    authorId: article.authorId,
    authorName: article.author?.name ?? null,
    tagsCount: article._count?.tags ?? 0,
  };
};

const toPublicArticleDetailDto = (article: PublicArticleDetailRecord): PublicArticleDetailDto => {
  return {
    ...toPublicArticleSummaryDto(article),
    excerptRich: article.excerptRich ?? null,
    contentRich: article.contentRich,
    audioUrl: article.audioUrl,
    audioChunks: article.audioChunks ?? null,
    updatedAt: article.updatedAt.toISOString(),
    tags: (article.tags ?? []).map((entry) => entry.tag),
  };
};

const toPublicArticleSummaryDtos = (articles: PublicArticleSummaryRecord[]) =>
  articles.map(toPublicArticleSummaryDto);

export const publicArticlesService = {
  async getBySlug(issueSlug: string, articleSlug: string) {
    const article = await publicArticlesRepository.getBySlug(issueSlug, articleSlug);

    if (!article) {
      throw new ApiError(404, "NOT_FOUND", "Article not found");
    }

    return toPublicArticleDetailDto(article as PublicArticleDetailRecord);
  },
  async listByIssue(issueSlug: string) {
    const articles = await publicArticlesRepository.listByIssueSlug(issueSlug);
    return toPublicArticleSummaryDtos(articles as PublicArticleSummaryRecord[]);
  },
  async listByCategory(categorySlug: string) {
    const articles = await publicArticlesRepository.listByCategorySlug(categorySlug);
    return toPublicArticleSummaryDtos(articles as PublicArticleSummaryRecord[]);
  },
  async listByTag(tagSlug: string) {
    const articles = await publicArticlesRepository.listByTagSlug(tagSlug);
    return toPublicArticleSummaryDtos(articles as PublicArticleSummaryRecord[]);
  },
  async listFeatured(limit: number) {
    const articles = await publicArticlesRepository.listFeatured(limit);
    return toPublicArticleSummaryDtos(articles as PublicArticleSummaryRecord[]);
  },
  async search(query: string, limit: number) {
    const articles = await publicArticlesRepository.search(query, limit);
    return toPublicArticleSummaryDtos(articles as PublicArticleSummaryRecord[]);
  },
};
