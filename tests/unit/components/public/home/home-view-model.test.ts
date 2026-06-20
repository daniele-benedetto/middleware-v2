import { describe, expect, it } from "vitest";

import {
  buildDossierHomeSections,
  buildHomeIssueSections,
  getHomeGridPattern,
  getHomeGridRows,
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

  it("uses the first sorted editorial as lead and shows remaining editorials in a section", () => {
    const lead = article({
      id: crypto.randomUUID(),
      categorySlug: "editoriale",
      categoryName: "Editoriale",
      isFeatured: true,
      position: 9,
      title: "Lead",
    });
    const second = article({
      id: crypto.randomUUID(),
      categorySlug: "editoriale",
      categoryName: "Editoriale",
      position: 2,
      title: "Second",
    });
    const third = article({
      id: crypto.randomUUID(),
      categorySlug: "editoriale",
      categoryName: "Editoriale",
      position: 3,
      title: "Third",
    });
    const essay = article({ categorySlug: "saggi", categoryName: "Saggi", position: 1 });

    const sections = buildHomeIssueSections(issue([third, essay, second, lead]));

    expect(sections.editorial).toEqual([lead, second, third]);
    expect(sections.sections).toMatchObject([
      { id: "editoriali", title: "Editoriali", articles: [second, third] },
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

  it("returns deterministic grid patterns up to ten articles", () => {
    expect(getHomeGridPattern(0)).toEqual([]);
    expect(getHomeGridPattern(1)).toEqual([1]);
    expect(getHomeGridPattern(2)).toEqual([2]);
    expect(getHomeGridPattern(3)).toEqual([3]);
    expect(getHomeGridPattern(4)).toEqual([4]);
    expect(getHomeGridPattern(5)).toEqual([3, 2]);
    expect(getHomeGridPattern(6)).toEqual([3, 3]);
    expect(getHomeGridPattern(7)).toEqual([3, 4]);
    expect(getHomeGridPattern(8)).toEqual([4, 4]);
    expect(getHomeGridPattern(9)).toEqual([3, 3, 3]);
    expect(getHomeGridPattern(10)).toEqual([5, 5]);
  });

  it("caps grid planning to ten articles before show-all expansion", () => {
    expect(getHomeGridPattern(11)).toEqual([5, 5]);
    expect(getHomeGridRows(Array.from({ length: 10 }, (_, index) => index))).toEqual([
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
    ]);
  });

  it("builds dossier sections from article position instead of featured priority", () => {
    const articles = Array.from({ length: 8 }, (_, index) =>
      article({
        id: crypto.randomUUID(),
        title: `Article ${index + 1}`,
        position: index + 1,
        isFeatured: [1, 2, 4].includes(index + 1),
      }),
    );

    const sections = buildDossierHomeSections(issue([...articles].reverse()));

    expect(sections.lead?.title).toBe("Article 1");
    expect(sections.bridge?.title).toBe("Article 2");
    expect(sections.voices.map((item) => item.title)).toEqual([
      "Article 3",
      "Article 4",
      "Article 5",
    ]);
    expect(sections.analysis.map((item) => item.title)).toEqual(["Article 6", "Article 7"]);
    expect(sections.closing?.title).toBe("Article 8");
  });
});
