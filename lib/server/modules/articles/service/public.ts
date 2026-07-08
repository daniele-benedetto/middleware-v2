import "server-only";

import { resolvePublicMediaUrl } from "@/lib/media/blob";
import { ApiError } from "@/lib/server/http/api-error";
import { publicArticlesRepository } from "@/lib/server/modules/articles/repository/public";

import type {
  PublicArticleDetailDto,
  PublicArticleSummaryDto,
} from "@/lib/server/modules/articles/dto/public";
import type { ArticleTitleStyled } from "@/lib/server/modules/articles/schema";

type PublicArticleSummaryRecord = {
  id: string;
  slug: string;
  title: string;
  titleStyled: unknown;
  excerpt: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  audioUrl: string | null;
  publishedAt: Date | null;
  issueId: string;
  categoryId: string;
  authorId: string | null;
  issue?: { slug: string; title: string } | null;
  category?: { slug: string; name: string } | null;
  author?: { name: string } | null;
};

type PublicArticleDetailRecord = PublicArticleSummaryRecord & {
  updatedAt: Date;
  excerptRich: unknown;
  contentRich: unknown;
  audioChunks: unknown;
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
    titleStyled: (article.titleStyled as ArticleTitleStyled | null) ?? null,
    excerpt: article.excerpt,
    imageUrl: resolvePublicMediaUrl(article.imageUrl),
    imageAlt: article.imageAlt,
    hasAudio: Boolean(article.audioUrl),
    publishedAt: article.publishedAt.toISOString(),
    issueId: article.issueId,
    issueSlug: article.issue.slug,
    issueTitle: article.issue.title,
    categoryId: article.categoryId,
    categorySlug: article.category.slug,
    categoryName: article.category.name,
    authorId: article.authorId,
    authorName: article.author?.name ?? null,
  };
};

const toPublicArticleDetailDto = (article: PublicArticleDetailRecord): PublicArticleDetailDto => {
  return {
    ...toPublicArticleSummaryDto(article),
    excerptRich: article.excerptRich ?? null,
    contentRich: article.contentRich,
    audioUrl: resolvePublicMediaUrl(article.audioUrl),
    audioChunks: article.audioChunks ?? null,
    updatedAt: article.updatedAt.toISOString(),
  };
};

const toPublicArticleSummaryDtos = (articles: PublicArticleSummaryRecord[]) =>
  articles.map(toPublicArticleSummaryDto);

export const publicArticlesService = {
  async getBySlug(slug: string) {
    const article = await publicArticlesRepository.getBySlug(slug);

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
  async search(query: string, limit: number) {
    const articles = await publicArticlesRepository.search(query, limit);
    return toPublicArticleSummaryDtos(articles as PublicArticleSummaryRecord[]);
  },
  async listPublished() {
    const articles = await publicArticlesRepository.listPublished();
    return toPublicArticleSummaryDtos(articles as PublicArticleSummaryRecord[]);
  },
  async listWithAudio() {
    const articles = await publicArticlesRepository.listWithAudio();
    return toPublicArticleSummaryDtos(articles as PublicArticleSummaryRecord[]);
  },
};
