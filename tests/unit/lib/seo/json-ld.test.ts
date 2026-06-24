import {
  buildArticlePageJsonLd,
  buildHomeJsonLd,
  buildIssuePageJsonLd,
  buildIssuesArchiveJsonLd,
  buildStaticPageJsonLd,
} from "@/lib/seo";

import type { PublicCurrentIssueDetail } from "@/lib/public/types/issues";
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

  it("builds article page graph with Article and BreadcrumbList", () => {
    const jsonLd = buildArticlePageJsonLd(article, "Descrizione");

    expect(getGraph(jsonLd).map((node) => node["@type"])).toEqual([
      "WebSite",
      "BreadcrumbList",
      "Article",
    ]);
  });

  it("builds issue page graph with CollectionPage and BreadcrumbList", () => {
    const jsonLd = buildIssuePageJsonLd(issue);

    expect(getGraph(jsonLd).map((node) => node["@type"])).toEqual([
      "WebSite",
      "BreadcrumbList",
      "CollectionPage",
    ]);
  });

  it("builds breadcrumb json-ld for archive and static pages", () => {
    const archiveJsonLd = buildIssuesArchiveJsonLd();
    const staticJsonLd = buildStaticPageJsonLd("Chi siamo", "/chi-siamo");

    expect(getGraph(archiveJsonLd).some((node) => node["@type"] === "BreadcrumbList")).toBe(true);
    expect(getGraph(staticJsonLd).some((node) => node["@type"] === "BreadcrumbList")).toBe(true);
  });
});
