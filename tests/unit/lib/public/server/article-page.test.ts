const publicArticlesServiceMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
}));
const publicIssuesServiceMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
  getUpcomingNumberingById: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/lib/server/modules/articles/service/public", () => ({
  publicArticlesService: publicArticlesServiceMock,
}));

vi.mock("@/lib/server/modules/issues/service/public", () => ({
  publicIssuesService: publicIssuesServiceMock,
}));

import { getPublicArticlePageData } from "@/lib/public/server/article-page";

function createArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "article-slug",
    title: "Article title",
    titleStyled: null,
    excerpt: null,
    imageUrl: null,
    imageAlt: null,
    imageSettings: undefined,
    hasAudio: false,
    publishedAt: "2026-01-01T00:00:00.000Z",
    issueId: "00000000-0000-0000-0000-000000000002",
    issueSlug: "issue-slug",
    issueTitle: "Issue title",
    isIssuePublic: false,
    categoryId: "00000000-0000-0000-0000-000000000003",
    categorySlug: "category-slug",
    categoryName: "Category name",
    authorId: null,
    authorName: null,
    excerptRich: null,
    contentRich: { type: "doc", content: [] },
    readingTimeMinutes: 1,
    audioUrl: null,
    audioChunks: null,
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("public article page data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("numbers an article of an unpublished issue without exposing related articles", async () => {
    const article = createArticle();
    const sibling = createArticle({ id: "00000000-0000-0000-0000-000000000004", slug: "sibling" });
    publicArticlesServiceMock.getBySlug.mockResolvedValue(article);
    publicIssuesServiceMock.getUpcomingNumberingById.mockResolvedValue({
      articles: [sibling, article],
      homeBlocks: [
        {
          id: "opening",
          type: "opening",
          articleIds: [sibling.id, article.id],
          featuredArticleId: sibling.id,
        },
      ],
    });

    await expect(getPublicArticlePageData("article-slug")).resolves.toMatchObject({
      articleNumber: 2,
      relatedArticles: [],
    });

    expect(publicIssuesServiceMock.getUpcomingNumberingById).toHaveBeenCalledWith(article.issueId);
    expect(publicIssuesServiceMock.getBySlug).not.toHaveBeenCalled();
  });

  it("falls back to no number when the unpublished issue cannot be loaded", async () => {
    publicArticlesServiceMock.getBySlug.mockResolvedValue(createArticle());
    publicIssuesServiceMock.getUpcomingNumberingById.mockResolvedValue(null);

    await expect(getPublicArticlePageData("article-slug")).resolves.toMatchObject({
      articleNumber: null,
      relatedArticles: [],
    });

    expect(publicIssuesServiceMock.getBySlug).not.toHaveBeenCalled();
  });
});
