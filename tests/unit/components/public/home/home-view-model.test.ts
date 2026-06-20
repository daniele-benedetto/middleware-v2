import { describe, expect, it } from "vitest";

import {
  buildHomeIssueSections,
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
  ...overrides,
});

const issue = (articles: HomeIssueArticle[]): PublicCurrentIssueDetail =>
  ({
    id: crypto.randomUUID(),
    title: "Issue",
    titleStyled: null,
    slug: "issue",
    description: null,
    publishedAt: "2026-01-01T00:00:00.000Z",
    articlesCount: articles.length,
    articles,
  }) as PublicCurrentIssueDetail;

describe("home view model", () => {
  it("sorts articles by featured flag, position, then published date", () => {
    const first = article({ id: crypto.randomUUID(), position: 4, isFeatured: true });
    const second = article({
      id: crypto.randomUUID(),
      position: 1,
      publishedAt: "2026-01-02T00:00:00.000Z",
    });
    const third = article({
      id: crypto.randomUUID(),
      position: 1,
      publishedAt: "2026-01-03T00:00:00.000Z",
    });

    expect(sortHomeArticles([third, second, first])).toEqual([first, second, third]);
  });

  it("keeps editorial articles separate and groups the remaining articles by category", () => {
    const editorial = article({
      categorySlug: "editoriale",
      categoryName: "Editoriale",
      position: 1,
    });
    const interview = article({
      categorySlug: "interviste",
      categoryName: "Interviste",
      position: 2,
    });
    const essay = article({ categorySlug: "saggi", categoryName: "Saggi", position: 3 });

    const sections = buildHomeIssueSections(issue([essay, editorial, interview]));

    expect(sections.editorial).toEqual([editorial]);
    expect(sections.sections).toMatchObject([
      { id: "interviste", title: "Interviste", articles: [interview] },
      { id: "saggi", title: "Saggi", articles: [essay] },
    ]);
  });

  it("orders dynamic category sections by the lowest article position", () => {
    const reviews = article({
      categorySlug: "recensioni",
      categoryName: "Recensioni",
      position: 8,
    });
    const reports = article({ categorySlug: "reportage", categoryName: "Reportage", position: 2 });
    const essays = article({ categorySlug: "saggi", categoryName: "Saggi", position: 5 });

    const sections = buildHomeIssueSections(issue([reviews, reports, essays]));

    expect(sections.sections.map((section) => section.id)).toEqual([
      "reportage",
      "saggi",
      "recensioni",
    ]);
  });

  it("creates a fallback section for articles without category metadata", () => {
    const uncategorized = article({ categorySlug: null, categoryName: null });

    const sections = buildHomeIssueSections(issue([uncategorized]));

    expect(sections.sections).toMatchObject([
      { id: "senza-categoria", title: "Senza categoria", articles: [uncategorized] },
    ]);
  });
});
