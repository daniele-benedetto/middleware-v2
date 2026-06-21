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
            type: "constellation",
            variant: "default",
            articleIds: [articleId],
            featuredArticleId: articleId,
          },
          {
            id: "sequenza",
            type: "sequence",
            variant: "default",
            articleIds: [articleId],
            featuredArticleId: articleId,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("allows empty home blocks", () => {
    expect(
      createIssueInputSchema.safeParse({
        title: "Issue 01",
        homeBlocks: [
          {
            id: "sequenza",
            type: "sequence",
            variant: "default",
            title: "Sequenza",
            description: null,
            articleIds: [],
            featuredArticleId: null,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("allows styled titles in home blocks", () => {
    const parsed = createIssueInputSchema.parse({
      title: "Issue 01",
      homeBlocks: [
        {
          id: "sequenza",
          type: "sequence",
          variant: "default",
          title: "Titolo blocco",
          titleStyled: [
            { text: "Titolo ", tone: "default" },
            { text: "blocco", tone: "primary" },
          ],
          description: null,
          articleIds: [],
          featuredArticleId: null,
        },
      ],
    });

    expect(parsed.homeBlocks?.[0]?.titleStyled).toEqual([
      { text: "Titolo ", tone: "default" },
      { text: "blocco", tone: "primary" },
    ]);
  });

  it("rejects opening blocks with copy or multiple articles", () => {
    expect(
      createIssueInputSchema.safeParse({
        title: "Issue 01",
        homeBlocks: [
          {
            id: "apertura",
            type: "opening",
            variant: "black",
            title: "Apertura",
            description: null,
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

  it("rejects rupture copy and allows closing copy", () => {
    expect(
      createIssueInputSchema.safeParse({
        title: "Issue 01",
        homeBlocks: [
          {
            id: "rottura",
            type: "rupture",
            variant: "default",
            title: "Rottura",
            description: null,
            articleIds: ["00000000-0000-4000-8000-000000000001"],
            featuredArticleId: "00000000-0000-4000-8000-000000000001",
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      createIssueInputSchema.safeParse({
        title: "Issue 01",
        homeBlocks: [
          {
            id: "chiusura",
            type: "closing",
            variant: "default",
            title: "Chiusura",
            description: "Copy",
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
