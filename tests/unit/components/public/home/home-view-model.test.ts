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
  contentPreview: null,
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
              variant: "red",
              title: "Apertura editoriale",
              description: null,
              articleIds: [lead.id],
              featuredArticleId: lead.id,
            },
            {
              id: "campo",
              type: "constellation",
              variant: "default",
              title: "Campo di tensione",
              description: "Testo deciso dentro l'uscita.",
              articleIds: [coreA.id, coreB.id],
              featuredArticleId: coreB.id,
            },
            {
              id: "sequenza",
              type: "sequence",
              variant: "default",
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
        variant: "red",
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

  it("does not compose narrative blocks when homeBlocks are not configured", () => {
    const articles = Array.from({ length: 4 }, (_, index) =>
      article({
        id: crypto.randomUUID(),
        title: `Article ${index + 1}`,
        publishedAt: `2026-01-0${index + 1}T00:00:00.000Z`,
        isFeatured: index === 2,
      }),
    );

    expect(composeNarrativeHomeBlocks(issue([...articles].reverse()))).toEqual([]);
  });

  it("omits configured blocks with no assigned articles", () => {
    const lead = article({
      id: crypto.randomUUID(),
      title: "Lead",
      publishedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(
      composeNarrativeHomeBlocks(
        issue(
          [lead],
          [
            {
              id: "apertura",
              type: "opening",
              variant: "black",
              title: null,
              description: null,
              articleIds: [lead.id],
              featuredArticleId: lead.id,
            },
            {
              id: "vuoto",
              type: "constellation",
              variant: "default",
              title: "Vuoto",
              description: null,
              articleIds: [],
              featuredArticleId: null,
            },
          ],
        ),
      ),
    ).toMatchObject([{ id: "apertura", articles: [{ title: "Lead" }] }]);
  });
});
