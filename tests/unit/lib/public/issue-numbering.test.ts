import {
  buildNumberedIssueArticles,
  getIssueArticleNumberMap,
  getIssueContentArticleNumbers,
  getUnpaginatedIssueArticles,
} from "@/lib/public/issue-numbering";

type TestArticle = {
  id: string;
  isFeatured: boolean;
  publishedAt: string;
  title: string;
};

function article(id: string, overrides: Partial<TestArticle> = {}): TestArticle {
  return {
    id,
    isFeatured: false,
    publishedAt: `2026-01-0${id}.000Z`,
    title: `Article ${id}`,
    ...overrides,
  };
}

describe("issue numbering", () => {
  it("builds one canonical order for dossier and article pages", () => {
    const articles = [
      article("1", { publishedAt: "2026-01-01T00:00:00.000Z" }),
      article("2", { publishedAt: "2026-01-02T00:00:00.000Z" }),
      article("3", { isFeatured: true, publishedAt: "2026-01-03T00:00:00.000Z" }),
      article("4", { publishedAt: "2026-01-04T00:00:00.000Z" }),
      article("5", { publishedAt: "2026-01-05T00:00:00.000Z" }),
    ];
    const blocks = [
      {
        type: "body" as const,
        articles: [articles[0], articles[1], articles[2]],
        featuredArticle: articles[2],
        featuredPlacement: "right" as const,
      },
      {
        type: "closing" as const,
        articles: [articles[4]],
        featuredArticle: articles[4],
        featuredPlacement: "left" as const,
      },
    ];

    const numberedArticles = buildNumberedIssueArticles(articles, blocks);
    const articleNumberMap = getIssueArticleNumberMap(articles, blocks);
    const contentNumberMap = getIssueContentArticleNumbers(
      blocks.filter((block) => block.type !== "closing"),
    );
    const unpaginatedArticles = getUnpaginatedIssueArticles(articles, blocks);

    expect(numberedArticles.map((item) => [item.article.id, item.number])).toEqual([
      ["1", 1],
      ["2", 2],
      ["3", 3],
      ["4", 4],
      ["5", 5],
    ]);
    expect([...articleNumberMap.entries()]).toEqual([
      ["1", 1],
      ["2", 2],
      ["3", 3],
      ["4", 4],
      ["5", 5],
    ]);
    expect([...contentNumberMap.entries()]).toEqual([
      ["1", 1],
      ["2", 2],
      ["3", 3],
    ]);
    expect(unpaginatedArticles.map((item) => item.id)).toEqual(["4"]);
  });
});
