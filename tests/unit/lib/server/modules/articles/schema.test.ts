import {
  createArticleInputSchema,
  listArticlesQuerySchema,
  reorderArticlesInputSchema,
  syncArticleTagsInputSchema,
  updateArticleInputSchema,
} from "@/lib/server/modules/articles/schema";

describe("articles schemas", () => {
  it("trims create input fields", () => {
    const parsed = createArticleInputSchema.parse({
      issueId: "00000000-0000-4000-8000-000000000001",
      categoryId: "00000000-0000-4000-8000-000000000002",
      authorId: "00000000-0000-4000-8000-000000000003",
      title: "  Article Title  ",
      slug: "  article-title  ",
      contentRich: { type: "doc" },
    });

    expect(parsed.title).toBe("Article Title");
    expect(parsed.slug).toBe("article-title");
  });

  it("rejects empty update payloads", () => {
    expect(updateArticleInputSchema.safeParse({}).success).toBe(false);
  });

  it("accepts nullable media fields and coerces publishedAt on update", () => {
    const parsed = updateArticleInputSchema.parse({
      imageUrl: null,
      audioUrl: null,
      audioChunks: null,
      status: "PUBLISHED",
      publishedAt: "2026-01-01T10:00:00.000Z",
      position: 3,
    });

    expect(parsed.imageUrl).toBeNull();
    expect(parsed.publishedAt).toBeInstanceOf(Date);
    expect(parsed.position).toBe(3);
  });

  it("rejects duplicate article ids during reorder", () => {
    expect(
      reorderArticlesInputSchema.safeParse({
        issueId: "00000000-0000-4000-8000-000000000001",
        orderedArticleIds: [
          "00000000-0000-4000-8000-000000000002",
          "00000000-0000-4000-8000-000000000002",
        ],
      }).success,
    ).toBe(false);
  });

  it("parses article list query defaults and boolean filters", () => {
    const parsed = listArticlesQuerySchema.parse({ featured: "true" });

    expect(parsed).toMatchObject({
      featured: true,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("accepts uuid arrays for tag sync", () => {
    expect(
      syncArticleTagsInputSchema.parse({
        tagIds: ["00000000-0000-4000-8000-000000000004"],
      }),
    ).toEqual({
      tagIds: ["00000000-0000-4000-8000-000000000004"],
    });
  });
});
