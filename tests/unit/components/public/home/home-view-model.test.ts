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
  position: 1,
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
  it("sorts articles by featured flag, position, then published date", () => {
    const featured = article({ id: crypto.randomUUID(), isFeatured: true, position: 4 });
    const older = article({
      id: crypto.randomUUID(),
      position: 1,
      publishedAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = article({
      id: crypto.randomUUID(),
      position: 1,
      publishedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(sortHomeArticles([newer, older, featured])).toEqual([featured, older, newer]);
  });

  it("composes issue-level homeBlocks preserving editorial copy and featured article", () => {
    const lead = article({ id: crypto.randomUUID(), title: "Lead", position: 1 });
    const coreA = article({ id: crypto.randomUUID(), title: "Core A", position: 2 });
    const coreB = article({ id: crypto.randomUUID(), title: "Core B", position: 3 });
    const sequenceA = article({ id: crypto.randomUUID(), title: "Sequence A", position: 4 });
    const sequenceB = article({ id: crypto.randomUUID(), title: "Sequence B", position: 5 });

    expect(
      composeNarrativeHomeBlocks(
        issue(
          [sequenceB, coreB, lead, sequenceA, coreA],
          [
            {
              id: "apertura",
              type: "opening",
              title: "Apertura editoriale",
              description: null,
              articleIds: [lead.id],
              featuredArticleId: lead.id,
            },
            {
              id: "campo",
              type: "constellation",
              title: "Campo di tensione",
              description: "Testo deciso dentro l'uscita.",
              articleIds: [coreA.id, coreB.id],
              featuredArticleId: coreB.id,
            },
            {
              id: "sequenza",
              type: "sequence",
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
        title: "Apertura editoriale",
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
        position: index + 1,
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
});
