const publicIssuesRepositoryMock = vi.hoisted(() => ({
  listPublished: vi.fn(),
  countPublished: vi.fn(),
  getCurrent: vi.fn(),
  getBySlug: vi.fn(),
}));

vi.mock("@/lib/server/modules/issues/repository/public", () => ({
  publicIssuesRepository: publicIssuesRepositoryMock,
}));

import { publicIssuesService } from "@/lib/server/modules/issues/service/public";

function createIssueRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    title: "Issue",
    titleStyled: null,
    slug: "issue",
    description: null,
    homeBlocks: null,
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    _count: { articles: 1 },
    ...overrides,
  };
}

function createArticleRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    slug: "article",
    title: "Article",
    titleStyled: null,
    excerpt: "Excerpt",
    imageUrl: null,
    imageAlt: null,
    audioUrl: null,
    isFeatured: false,
    contentRich: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Short text" }] }],
    },
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    category: null,
    author: null,
    tags: [],
    ...overrides,
  };
}

describe("publicIssuesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists published items without running a total count", async () => {
    publicIssuesRepositoryMock.listPublished.mockResolvedValue([createIssueRecord()]);

    const result = await publicIssuesService.listPublishedItems({ page: 1, pageSize: 10 });

    expect(result).toHaveLength(1);
    expect(publicIssuesRepositoryMock.listPublished).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
    });
    expect(publicIssuesRepositoryMock.countPublished).not.toHaveBeenCalled();
  });

  it("maps public issue detail article metadata", async () => {
    publicIssuesRepositoryMock.getCurrent.mockResolvedValue(
      createIssueRecord({
        articles: [
          createArticleRecord({
            imageAlt: "Descrizione editoriale immagine",
          }),
        ],
      }),
    );

    const result = await publicIssuesService.getCurrent();

    expect(result.articles[0]?.excerpt).toBe("Excerpt");
    expect(result.articles[0]?.imageAlt).toBe("Descrizione editoriale immagine");
  });
});
