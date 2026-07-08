const articlesRepositoryMock = vi.hoisted(() => ({
  list: vi.fn(),
  count: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  archive: vi.fn(),
  listIdsByIssue: vi.fn(),
}));

vi.mock("@/lib/server/modules/articles/repository", () => ({
  articlesRepository: articlesRepositoryMock,
}));

import { articlesService } from "@/lib/server/modules/articles/service";
import { createPrismaKnownRequestError } from "@/tests/helpers/create-prisma-known-request-error";

function createArticleRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    issueId: "22222222-2222-2222-2222-222222222222",
    categoryId: "33333333-3333-3333-3333-333333333333",
    authorId: "44444444-4444-4444-4444-444444444444",
    title: "Article Title",
    slug: "article-title",
    status: "DRAFT",
    publishedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    issue: { title: "Issue 01" },
    category: { name: "Politics" },
    author: { name: "Editor", email: "editor@example.com" },
    ...overrides,
  };
}

function createArticleDetailRecord(overrides: Record<string, unknown> = {}) {
  return {
    ...createArticleRecord(),
    excerpt: "Legacy excerpt",
    excerptRich: null,
    contentRich: { type: "doc", content: [{ type: "paragraph" }] },
    imageUrl: null,
    audioUrl: null,
    audioChunks: null,
    ...overrides,
  };
}

describe("articlesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates articles with normalized slug and plain excerpt", async () => {
    articlesRepositoryMock.create.mockResolvedValue(createArticleRecord());

    const result = await articlesService.create({
      issueId: "22222222-2222-2222-2222-222222222222",
      categoryId: "33333333-3333-3333-3333-333333333333",
      authorId: "44444444-4444-4444-4444-444444444444",
      title: "Article Title",
      slug: "  Article Title!  ",
      excerptRich: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Intro" },
              { type: "hardBreak" },
              { type: "text", text: "Second line" },
            ],
          },
        ],
      },
      contentRich: { type: "doc", content: [{ type: "paragraph" }] },
    });

    expect(articlesRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "article-title",
        excerpt: "Intro Second line",
      }),
    );
    expect(result).toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
      slug: "article-title",
    });
  });

  it("maps duplicate slug errors to a domain conflict", async () => {
    articlesRepositoryMock.create.mockRejectedValue(
      createPrismaKnownRequestError("P2002", "duplicate slug"),
    );

    await expect(
      articlesService.create({
        issueId: "22222222-2222-2222-2222-222222222222",
        categoryId: "33333333-3333-3333-3333-333333333333",
        authorId: "44444444-4444-4444-4444-444444444444",
        title: "Article Title",
        slug: "article-title",
        contentRich: { type: "doc", content: [{ type: "paragraph" }] },
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      details: { reason: "ARTICLE_SLUG_EXISTS" },
    });
  });

  it("builds excerptRich fallback for legacy records", async () => {
    articlesRepositoryMock.getById.mockResolvedValue(createArticleDetailRecord());

    const result = await articlesService.getById("11111111-1111-1111-1111-111111111111");

    expect(result.excerptRich).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Legacy excerpt" }],
        },
      ],
    });
    expect(result.contentRich).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("validates publishedAt consistency before updating", async () => {
    articlesRepositoryMock.getById.mockResolvedValue(createArticleRecord());

    await expect(
      articlesService.update("11111111-1111-1111-1111-111111111111", {
        status: "PUBLISHED",
        publishedAt: null,
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "publishedAt is required when status is PUBLISHED",
    });
    expect(articlesRepositoryMock.update).not.toHaveBeenCalled();
  });

  it.each([
    {
      method: "publish",
      current: createArticleRecord({
        status: "PUBLISHED",
        publishedAt: new Date("2026-01-03T00:00:00.000Z"),
      }),
      repoMethod: "publish",
      run: () => articlesService.publish("11111111-1111-1111-1111-111111111111"),
    },
    {
      method: "unpublish",
      current: createArticleRecord({ status: "DRAFT", publishedAt: null }),
      repoMethod: "unpublish",
      run: () => articlesService.unpublish("11111111-1111-1111-1111-111111111111"),
    },
    {
      method: "archive",
      current: createArticleRecord({ status: "ARCHIVED", publishedAt: null }),
      repoMethod: "archive",
      run: () => articlesService.archive("11111111-1111-1111-1111-111111111111"),
    },
  ])("returns current record without repository write on idempotent $method", async (testCase) => {
    articlesRepositoryMock.getById.mockResolvedValue(testCase.current);

    const result = await testCase.run();

    expect(
      articlesRepositoryMock[testCase.repoMethod as keyof typeof articlesRepositoryMock],
    ).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
    });
  });
});
