import {
  buildArticlePageJsonLd,
  buildHomeJsonLd,
  buildIssuePageJsonLd,
  buildIssuesArchiveJsonLd,
  buildStaticPageJsonLd,
} from "@/lib/seo";

import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";
import type { PublicArticleDetailDto } from "@/lib/server/modules/articles/dto/public";

type JsonLdNode = Record<string, unknown>;

function getGraph(jsonLd: { "@graph": object[] }): JsonLdNode[] {
  return jsonLd["@graph"] as JsonLdNode[];
}

const issue = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Numero Uno",
  titleStyled: null,
  slug: "numero-uno",
  description: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ text: "Descrizione" }] }],
  },
  homeBlocks: null,
  publishedAt: "2026-01-01T00:00:00.000Z",
  articlesCount: 1,
  articles: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      slug: "articolo-uno",
      title: "Articolo Uno",
      titleStyled: null,
      excerpt: "Excerpt",
      imageUrl: "/api/public/media/blob?pathname=covers%2Fhero.jpg",
      imageAlt: "Hero alt",
      hasAudio: false,
      isFeatured: true,
      readingTimeMinutes: 5,
      publishedAt: "2026-01-01T00:00:00.000Z",
      categorySlug: "territorio",
      categoryName: "Territorio",
      authorName: "Autrice",
      tags: [],
    },
  ],
} satisfies PublicCurrentIssueDetail;

const article = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "articolo-uno",
  title: "Articolo Uno",
  titleStyled: null,
  excerpt: "Excerpt",
  imageUrl: "/api/public/media/blob?pathname=covers%2Fhero.jpg",
  imageAlt: "Hero alt",
  hasAudio: false,
  isFeatured: true,
  publishedAt: "2026-01-01T00:00:00.000Z",
  issueId: "11111111-1111-4111-8111-111111111111",
  issueSlug: "numero-uno",
  issueTitle: "Numero Uno",
  categoryId: "33333333-3333-4333-8333-333333333333",
  categorySlug: "territorio",
  categoryName: "Territorio",
  authorId: null,
  authorName: "Autrice",
  tagsCount: 1,
  excerptRich: null,
  contentRich: { type: "doc", content: [] },
  audioUrl: null,
  audioChunks: null,
  updatedAt: "2026-01-02T00:00:00.000Z",
  tags: [{ id: "44444444-4444-4444-8444-444444444444", slug: "tag", name: "Tag" }],
} satisfies PublicArticleDetailDto;

describe("seo json-ld", () => {
  it("builds home collection json-ld with absolute image urls", () => {
    const jsonLd = buildHomeJsonLd(issue);
    const collection = getGraph(jsonLd).find((node) => node["@type"] === "CollectionPage");
    const hasPart = collection?.hasPart as JsonLdNode[] | undefined;
    const firstArticle = hasPart?.[0];
    const image = firstArticle?.image as JsonLdNode | undefined;

    expect(image?.url).toBe(
      "http://localhost:3000/api/public/media/blob?pathname=covers%2Fhero.jpg",
    );
  });

  it("builds article page graph with Organization, Article and BreadcrumbList", () => {
    const jsonLd = buildArticlePageJsonLd(article, "Descrizione");
    const graph = getGraph(jsonLd);

    expect(graph.map((node) => node["@type"])).toEqual([
      "WebSite",
      "Organization",
      "BreadcrumbList",
      "Article",
    ]);

    const articleNode = graph.find((node) => node["@type"] === "Article");
    const publisher = articleNode?.publisher as JsonLdNode | undefined;
    expect(publisher?.["@id"]).toBe("http://localhost:3000/#organization");
  });

  it("builds issue page graph with CollectionPage and BreadcrumbList", () => {
    const jsonLd = buildIssuePageJsonLd(issue);

    expect(getGraph(jsonLd).map((node) => node["@type"])).toEqual([
      "WebSite",
      "Organization",
      "BreadcrumbList",
      "CollectionPage",
    ]);
  });

  it("builds archive json-ld with a CollectionPage ItemList of issues", () => {
    const archiveJsonLd = buildIssuesArchiveJsonLd([
      {
        id: issue.id,
        title: issue.title,
        titleStyled: null,
        slug: issue.slug,
        description: issue.description,
        publishedAt: issue.publishedAt,
        articlesCount: issue.articlesCount,
      } as PublicIssueListItem,
    ]);
    const graph = getGraph(archiveJsonLd);

    expect(graph.some((node) => node["@type"] === "BreadcrumbList")).toBe(true);

    const collection = graph.find((node) => node["@type"] === "CollectionPage");
    const itemList = collection?.mainEntity as JsonLdNode | undefined;
    const items = itemList?.itemListElement as JsonLdNode[] | undefined;
    expect(items?.[0]?.url).toBe("http://localhost:3000/uscite/numero-uno");
  });

  it("builds breadcrumb json-ld for static pages", () => {
    const staticJsonLd = buildStaticPageJsonLd("Chi siamo", "/chi-siamo");

    expect(getGraph(staticJsonLd).some((node) => node["@type"] === "BreadcrumbList")).toBe(true);
  });
});
