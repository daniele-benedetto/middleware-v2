import { describe, expect, it } from "vitest";

import {
  composeNarrativeHomeBlocks,
  sortHomeArticles,
  type HomeIssueArticle,
} from "@/components/public/home/home-view-model";

import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";

const article = (overrides: Partial<HomeIssueArticle>): HomeIssueArticle => ({
  id: crypto.randomUUID(),
  slug: "article",
  title: "Article",
  titleStyled: null,
  excerpt: null,
  imageUrl: null,
  hasAudio: false,
  isFeatured: false,
  readingTimeMinutes: 1,
  publishedAt: "2026-01-01T00:00:00.000Z",
  categorySlug: "categoria",
  categoryName: "Categoria",
  authorName: null,
  tags: [],
  ...overrides,
});

const issue = (
  articles: HomeIssueArticle[],
  homeBlocks: PublicCurrentIssueDetail["homeBlocks"] = null,
): PublicCurrentIssueDetail =>
  ({
    id: crypto.randomUUID(),
    title: "Issue",
    titleStyled: null,
    slug: "issue",
    description: null,
    homeBlocks,
    publishedAt: "2026-01-01T00:00:00.000Z",
    articlesCount: articles.length,
    articles,
  }) as PublicCurrentIssueDetail;

describe("home view model", () => {
  it("sorts articles by featured flag, then published date", () => {
    const featured = article({ id: crypto.randomUUID(), isFeatured: true });
    const older = article({
      id: crypto.randomUUID(),
      publishedAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = article({
      id: crypto.randomUUID(),
      publishedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(sortHomeArticles([newer, older, featured])).toEqual([featured, older, newer]);
  });

  it("composes issue-level homeBlocks preserving editorial copy and featured article", () => {
    const lead = article({ id: crypto.randomUUID(), title: "Lead" });
    const coreA = article({ id: crypto.randomUUID(), title: "Core A" });
    const coreB = article({ id: crypto.randomUUID(), title: "Core B" });
    const sequenceA = article({ id: crypto.randomUUID(), title: "Sequence A" });
    const sequenceB = article({ id: crypto.randomUUID(), title: "Sequence B" });

    expect(
      composeNarrativeHomeBlocks(
        issue(
          [sequenceB, coreB, lead, sequenceA, coreA],
          [
            {
              id: "apertura",
              type: "opening",
              source: "manual",
              title: "Apertura editoriale",
              description: null,
              articleIds: [lead.id],
              featuredArticleId: lead.id,
            },
            {
              id: "campo",
              type: "constellation",
              source: "manual",
              title: "Campo di tensione",
              description: "Testo deciso dentro l'uscita.",
              articleIds: [coreA.id, coreB.id],
              featuredArticleId: coreB.id,
            },
            {
              id: "sequenza",
              type: "sequence",
              source: "manual",
              title: "Sequenza narrativa",
              description: null,
              articleIds: [sequenceA.id, sequenceB.id],
              featuredArticleId: sequenceA.id,
            },
          ],
        ),
      ),
    ).toMatchObject([
      {
        id: "apertura",
        type: "opening",
        title: null,
        articles: [{ title: "Lead" }],
        featuredArticle: { title: "Lead" },
      },
      {
        id: "campo",
        type: "constellation",
        title: "Campo di tensione",
        description: "Testo deciso dentro l'uscita.",
        articles: [{ title: "Core A" }, { title: "Core B" }],
        featuredArticle: { title: "Core B" },
      },
      {
        id: "sequenza",
        type: "sequence",
        title: "Sequenza narrativa",
        articles: [{ title: "Sequence A" }, { title: "Sequence B" }],
        featuredArticle: { title: "Sequence A" },
      },
    ]);
  });

  it("falls back to opening plus constellation when homeBlocks are not configured", () => {
    const articles = Array.from({ length: 4 }, (_, index) =>
      article({
        id: crypto.randomUUID(),
        title: `Article ${index + 1}`,
        publishedAt: `2026-01-0${index + 1}T00:00:00.000Z`,
        isFeatured: index === 2,
      }),
    );

    expect(composeNarrativeHomeBlocks(issue([...articles].reverse()))).toMatchObject([
      { type: "opening", articles: [{ title: "Article 1" }] },
      {
        type: "constellation",
        articles: [{ title: "Article 2" }, { title: "Article 3" }, { title: "Article 4" }],
        featuredArticle: { title: "Article 3" },
      },
    ]);
  });

  it("resolves remainder blocks with articles not used by manual blocks", () => {
    const lead = article({
      id: crypto.randomUUID(),
      title: "Lead",
      publishedAt: "2026-01-01T00:00:00.000Z",
    });
    const manual = article({
      id: crypto.randomUUID(),
      title: "Manual",
      publishedAt: "2026-01-02T00:00:00.000Z",
    });
    const remainderA = article({
      id: crypto.randomUUID(),
      title: "Remainder A",
      publishedAt: "2026-01-03T00:00:00.000Z",
    });
    const remainderB = article({
      id: crypto.randomUUID(),
      title: "Remainder B",
      publishedAt: "2026-01-04T00:00:00.000Z",
    });

    expect(
      composeNarrativeHomeBlocks(
        issue(
          [remainderB, manual, remainderA, lead],
          [
            {
              id: "apertura",
              type: "opening",
              source: "manual",
              title: null,
              description: null,
              articleIds: [lead.id],
              featuredArticleId: lead.id,
            },
            {
              id: "manuale",
              type: "constellation",
              source: "manual",
              title: "Manuale",
              description: null,
              articleIds: [manual.id],
              featuredArticleId: manual.id,
            },
            {
              id: "resto",
              type: "sequence",
              source: "remainder",
              title: "Resto",
              description: null,
              articleIds: [],
              featuredArticleId: null,
            },
          ],
        ),
      ),
    ).toMatchObject([
      { id: "apertura", articles: [{ title: "Lead" }] },
      { id: "manuale", articles: [{ title: "Manual" }] },
      { id: "resto", articles: [{ title: "Remainder A" }, { title: "Remainder B" }] },
    ]);
  });
});
