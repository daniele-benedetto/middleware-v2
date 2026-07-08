const mediaStorageMock = vi.hoisted(() => ({
  mediaStorage: {
    get: vi.fn(),
  },
}));
const publicArticlesServiceMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
  listWithAudio: vi.fn(),
}));

vi.mock("next/cache", () => ({
  cacheLife: () => {},
  cacheTag: () => {},
}));

vi.mock("@/lib/server/storage/media-storage", () => mediaStorageMock);

vi.mock("@/lib/server/modules/articles/service/public", () => ({
  publicArticlesService: publicArticlesServiceMock,
}));

import { getPublicArticleListenPageData } from "@/lib/public/server/article-listen-page";
import { mediaStorage } from "@/lib/server/storage/media-storage";

const getMediaMock = vi.mocked(mediaStorage.get);

function createJsonStream(value: unknown) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify(value)));
      controller.close();
    },
  });
}

function createArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: "article-1",
    slug: "article-slug",
    title: "Article title",
    titleStyled: null,
    excerpt: null,
    imageUrl: null,
    imageAlt: null,
    hasAudio: true,
    audioUrl: "/api/public/media/blob?pathname=audio%2Farticle.mp3",
    audioChunks: null,
    publishedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    issueId: "00000000-0000-0000-0000-000000000001",
    issueSlug: "issue",
    issueTitle: "Issue",
    categoryId: "00000000-0000-0000-0000-000000000002",
    categorySlug: "category",
    categoryName: "Category",
    authorId: null,
    authorName: null,
    excerptRich: null,
    contentRich: { type: "doc" },
    ...overrides,
  };
}

describe("getPublicArticleListenPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for published articles without audio", async () => {
    publicArticlesServiceMock.getBySlug.mockResolvedValue(createArticle({ audioUrl: null }));

    await expect(getPublicArticleListenPageData("article-slug")).resolves.toBeNull();
  });

  it("loads and normalizes chunks from the private media json reference", async () => {
    publicArticlesServiceMock.getBySlug.mockResolvedValue(
      createArticle({ audioChunks: "/api/cms/media/blob?pathname=chunks%2Farticle.json" }),
    );
    getMediaMock.mockResolvedValue({
      stream: createJsonStream([{ id: 1, text: " Intro ", start: 0, end: 4 }]),
      contentType: "application/json",
      url: "/api/public/media/blob?pathname=chunks%2Farticle.json",
      downloadUrl: "/api/cms/media/blob?pathname=chunks%2Farticle.json&download=1",
      pathname: "chunks/article.json",
      size: 10,
      uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
      etag: "etag-1",
    });

    const result = await getPublicArticleListenPageData("article-slug");

    expect(getMediaMock).toHaveBeenCalledWith("chunks/article.json");
    expect(result?.chunks).toEqual([
      { id: "1", text: "Intro", start: 0, end: 4, confidence: null },
    ]);
  });

  it("keeps the page available when chunks cannot be loaded", async () => {
    publicArticlesServiceMock.getBySlug.mockResolvedValue(
      createArticle({ audioChunks: "/api/cms/media/blob?pathname=chunks%2Fmissing.json" }),
    );
    getMediaMock.mockRejectedValue(new Error("missing"));

    const result = await getPublicArticleListenPageData("article-slug");

    expect(result?.article.audioUrl).toBeTruthy();
    expect(result?.chunks).toEqual([]);
  });
});
