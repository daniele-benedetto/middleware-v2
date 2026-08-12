import {
  createIssueInputSchema,
  listIssuesQuerySchema,
  reorderIssuesInputSchema,
  updateIssueInputSchema,
} from "@/lib/server/modules/issues/schema";

describe("issues schemas", () => {
  it("applies create defaults and coerces publishedAt", () => {
    const parsed = createIssueInputSchema.parse({
      title: "  Issue 01  ",
      publishedAt: "2026-01-01T10:00:00.000Z",
    });

    expect(parsed.title).toBe("Issue 01");
    expect(parsed.homeVariant).toBe("black");
    expect(parsed.isActive).toBe(true);
    expect(parsed.publishedAt).toBeInstanceOf(Date);
  });

  it("rejects empty update payloads", () => {
    expect(updateIssueInputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects duplicate article assignments across home blocks", () => {
    const articleId = "00000000-0000-4000-8000-000000000001";

    expect(
      createIssueInputSchema.safeParse({
        title: "Issue 01",
        homeBlocks: [
          {
            id: "campo",
            type: "body",
            articleIds: [articleId],
            featuredArticleId: articleId,
          },
          {
            id: "chiusura",
            type: "closing",
            articleIds: [articleId],
            featuredArticleId: articleId,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("allows empty home blocks", () => {
    const parsed = createIssueInputSchema.parse({
      title: "Issue 01",
      homeBlocks: [
        {
          id: "corpo",
          type: "body",
          articleIds: [],
          featuredArticleId: null,
        },
      ],
    });

    expect(parsed.homeBlocks?.[0]?.type === "body" && parsed.homeBlocks[0].featuredPlacement).toBe(
      "left",
    );
  });

  it("allows body featured placement on the right", () => {
    const parsed = createIssueInputSchema.parse({
      title: "Issue 01",
      homeBlocks: [
        {
          id: "corpo",
          type: "body",
          articleIds: [],
          featuredArticleId: null,
          featuredPlacement: "right",
        },
      ],
    });

    expect(parsed.homeBlocks?.[0]?.type === "body" && parsed.homeBlocks[0].featuredPlacement).toBe(
      "right",
    );
  });

  it("allows course blocks without article fields", () => {
    const courseId = "00000000-0000-4000-8000-000000000001";
    const parsed = createIssueInputSchema.parse({
      title: "Issue 01",
      homeBlocks: [{ id: "corso", type: "course", courseId }],
    });

    expect(parsed.homeBlocks).toEqual([{ id: "corso", type: "course", courseId }]);
  });

  it("allows map blocks without article fields", () => {
    const mapId = "00000000-0000-4000-8000-000000000001";
    const parsed = createIssueInputSchema.parse({
      title: "Issue 01",
      homeBlocks: [{ id: "mappa", type: "map", mapId }],
    });

    expect(parsed.homeBlocks).toEqual([{ id: "mappa", type: "map", mapId }]);
  });

  it("rejects sequence home blocks", () => {
    expect(
      createIssueInputSchema.safeParse({
        title: "Issue 01",
        homeBlocks: [
          {
            id: "sequenza",
            type: "sequence",
            articleIds: [],
            featuredArticleId: null,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("strips obsolete editorial copy from home blocks", () => {
    const parsed = createIssueInputSchema.parse({
      title: "Issue 01",
      homeBlocks: [
        {
          id: "corpo",
          type: "body",
          title: "Titolo obsoleto",
          titleStyled: [
            { text: "Titolo ", tone: "default" },
            { text: "blocco", tone: "primary" },
          ],
          description: "Descrizione obsoleta",
          articleIds: [],
          featuredArticleId: null,
        },
      ],
    });

    expect(parsed.homeBlocks?.[0]).not.toHaveProperty("title");
    expect(parsed.homeBlocks?.[0]).not.toHaveProperty("titleStyled");
    expect(parsed.homeBlocks?.[0]).not.toHaveProperty("description");
  });

  it("rejects opening blocks with multiple articles", () => {
    expect(
      createIssueInputSchema.safeParse({
        title: "Issue 01",
        homeBlocks: [
          {
            id: "apertura",
            type: "opening",
            articleIds: [
              "00000000-0000-4000-8000-000000000001",
              "00000000-0000-4000-8000-000000000002",
            ],
            featuredArticleId: "00000000-0000-4000-8000-000000000001",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("allows closing blocks", () => {
    expect(
      createIssueInputSchema.safeParse({
        title: "Issue 01",
        homeBlocks: [
          {
            id: "chiusura",
            type: "closing",
            articleIds: ["00000000-0000-4000-8000-000000000001"],
            featuredArticleId: "00000000-0000-4000-8000-000000000001",
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects duplicate ids during issue reorder", () => {
    expect(
      reorderIssuesInputSchema.safeParse({
        orderedIssueIds: [
          "00000000-0000-4000-8000-000000000001",
          "00000000-0000-4000-8000-000000000001",
        ],
      }).success,
    ).toBe(false);
  });

  it("parses query defaults and boolean filters", () => {
    const parsed = listIssuesQuerySchema.parse({ isActive: "false", published: "true" });

    expect(parsed).toMatchObject({
      isActive: false,
      published: true,
      sortBy: "sortOrder",
      sortOrder: "asc",
    });
  });
});
