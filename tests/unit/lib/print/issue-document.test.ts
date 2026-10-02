import { describe, expect, it } from "vitest";

import { buildPrintIssueDocument } from "@/lib/print/issue-document";
import { inspectPrintIssueDocument } from "@/lib/print/preflight";

import type {
  PrintArticleSource,
  PrintCourseSource,
  PrintIssueSource,
  PrintMapSource,
} from "@/lib/print/issue-document";

const ids = {
  opening: "00000000-0000-4000-8000-000000000001",
  body: "00000000-0000-4000-8000-000000000002",
  rupture: "00000000-0000-4000-8000-000000000003",
  closing: "00000000-0000-4000-8000-000000000004",
};

const content = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const article = (id: string, overrides: Partial<PrintArticleSource> = {}): PrintArticleSource => ({
  id,
  slug: `slug-${id.at(-1)}`,
  title: `Articolo ${id.at(-1)}`,
  titleStyled: null,
  excerpt: `Sommario ${id.at(-1)}`,
  authorName: null,
  categoryName: null,
  contentRich: content("Testo"),
  imageUrl: null,
  imageAlt: null,
  ...overrides,
});

const issue = (overrides: Partial<PrintIssueSource> = {}): PrintIssueSource => ({
  slug: "numero-zero",
  title: "Titolo del numero",
  titleStyled: null,
  description: content("Occhiello del numero"),
  publishedAt: "2026-07-01T00:00:00.000Z",
  homeVariant: "black",
  printSettings: {
    showIssueNumber: true,
    coverImageUrl: null,
    coverImageAlt: "",
    coverImageMode: "contained",
  },
  homeBlocks: [
    { id: "o", type: "opening", articleIds: [ids.opening], featuredPlacement: "left" },
    { id: "b", type: "body", articleIds: [ids.body], featuredPlacement: "left" },
    { id: "m", type: "map", mapId: null },
    {
      id: "r",
      type: "rupture",
      articleIds: [ids.rupture],
      featuredPlacement: "left",
      printSettings: {
        [ids.rupture]: {
          showInIssueIntro: true,
          stopWithSiteCta: true,
          excludeFromPrint: false,
          showEndLogo: true,
          layout: "default",
        },
      },
    },
    { id: "c", type: "closing", articleIds: [ids.closing], featuredPlacement: "left" },
  ],
  ...overrides,
});

const articles = [
  article(ids.opening, { imageUrl: "/api/cms/media/blob?pathname=opening.jpg" }),
  article(ids.body, {
    title: "“Ho ricollegato i puntini”, Intervista a Sara",
    categoryName: "Interviste",
    imageUrl: "/api/cms/media/blob?pathname=body.jpg",
  }),
  article(ids.rupture),
  article(ids.closing, { imageUrl: "/api/cms/media/blob?pathname=closing.jpg", imageAlt: "Foto" }),
];

describe("buildPrintIssueDocument", () => {
  it("follows the home block order with the special and the body articles", () => {
    const document = buildPrintIssueDocument({
      issue: issue(),
      articles,
      maps: [],
      courses: [],
      issueNumber: "00",
    });

    expect(
      document.sections.map((section) => [
        section.kind === "article" && section.role,
        section.anchor,
      ]),
    ).toEqual([
      ["opening", `print-${ids.opening}`],
      ["body", `print-${ids.body}`],
      ["rupture", `print-${ids.rupture}`],
      ["closing", `print-${ids.closing}`],
    ]);
  });

  it("presents interviews with headline, subtitle, category label and invite", () => {
    const document = buildPrintIssueDocument({
      issue: issue(),
      articles,
      maps: [],
      courses: [],
      issueNumber: "00",
    });

    expect(document.sections[1]).toMatchObject({
      title: [{ text: "“Ho ricollegato i puntini”", accent: false, breakAfter: false }],
      subtitle: "Intervista a Sara",
      label: "Interviste",
      ctaLabel: "Leggi l’intera intervista su",
      dark: false,
    });
    expect(document.sections[0]).toMatchObject({
      label: "Editoriale",
      ctaLabel: "Leggi l’intero articolo su",
    });
  });

  it("marks photo openings dark only when the issue color has a dark tone", () => {
    const black = buildPrintIssueDocument({
      issue: issue(),
      articles,
      maps: [],
      courses: [],
      issueNumber: "00",
    });
    const neutral = buildPrintIssueDocument({
      issue: issue({ homeVariant: "default" }),
      articles,
      maps: [],
      courses: [],
      issueNumber: "00",
    });

    expect(black.sections.map((section) => section.kind === "article" && section.dark)).toEqual([
      true,
      false,
      false,
      true,
    ]);
    expect(neutral.sections.every((section) => section.kind === "article" && !section.dark)).toBe(
      true,
    );
  });

  it("maps print settings to stop and cover highlights, and skips excluded articles", () => {
    const blocks = issue().homeBlocks!.map((block) =>
      block.id === "c" && "articleIds" in block
        ? {
            ...block,
            printSettings: {
              [ids.closing]: {
                showInIssueIntro: false,
                stopWithSiteCta: false,
                excludeFromPrint: true,
                showEndLogo: false,
                layout: "default" as const,
              },
            },
          }
        : block,
    );
    const document = buildPrintIssueDocument({
      issue: issue({ homeBlocks: blocks }),
      articles,
      maps: [],
      courses: [],
      issueNumber: "00",
    });

    expect(document.sections.map((section) => section.kind === "article" && section.role)).toEqual([
      "opening",
      "body",
      "rupture",
    ]);
    expect(document.sections[2]).toMatchObject({
      stopWithSiteCta: true,
      showEndLogo: true,
      articlePath: "/articoli/slug-3",
    });
    expect(document.sections[0]).toMatchObject({ showEndLogo: false });
    expect(document.cover.highlights.map((highlight) => highlight.anchor)).toEqual([
      `print-${ids.rupture}`,
    ]);
  });

  it("builds the cover meta and falls back to the closing photo", () => {
    const document = buildPrintIssueDocument({
      issue: issue(),
      articles,
      maps: [],
      courses: [],
      issueNumber: "N. 07",
    });

    expect(document.cover.meta).toBe("N. 07 · luglio 2026");
    expect(document.cover.image).toEqual({
      url: "/api/cms/media/blob?pathname=closing.jpg",
      alt: "Foto",
      bleed: false,
    });
  });

  it("prefers the configured cover image and hides the issue number when disabled", () => {
    const document = buildPrintIssueDocument({
      issue: issue({
        printSettings: {
          showIssueNumber: false,
          coverImageUrl: "/api/cms/media/blob?pathname=cover.jpg",
          coverImageAlt: "",
          coverImageMode: "bleed",
        },
      }),
      articles,
      maps: [],
      courses: [],
      issueNumber: "07",
    });

    expect(document.cover.meta).toBe("luglio 2026");
    expect(document.cover.image).toEqual({
      url: "/api/cms/media/blob?pathname=cover.jpg",
      alt: "Titolo del numero",
      bleed: true,
    });
  });
});

const map: PrintMapSource = {
  id: "00000000-0000-4000-8000-0000000000aa",
  title: "Mappatura degli ETS",
  titleStyled: null,
  descriptionRich: content("Enti del terzo settore a Modena"),
  items: [
    {
      id: "item-b",
      title: "Secondo ente",
      descriptionRich: null,
      latitude: "44.66",
      longitude: "10.94",
      sortOrder: 2,
    },
    {
      id: "item-a",
      title: "Primo ente",
      descriptionRich: content("📍 Sacca, Modena 🌐 sito"),
      latitude: "44.64",
      longitude: "10.91",
      sortOrder: 1,
    },
  ],
};

describe("buildPrintIssueDocument article layouts", () => {
  const withLayout = (articleId: string, layout: "default" | "fullscreen") =>
    issue().homeBlocks!.map((block) =>
      "articleIds" in block && block.articleIds.includes(articleId)
        ? {
            ...block,
            printSettings: {
              [articleId]: {
                showInIssueIntro: false,
                stopWithSiteCta: false,
                excludeFromPrint: false,
                showEndLogo: false,
                layout,
              },
            },
          }
        : block,
    );

  it("keeps the standard layout by default", () => {
    const document = buildPrintIssueDocument({
      issue: issue(),
      articles,
      maps: [],
      courses: [],
      issueNumber: "00",
    });

    expect(document.sections[0]).toMatchObject({ layout: "default", layoutFallback: false });
  });

  it("prints fullscreen openings when the article has a photo", () => {
    const document = buildPrintIssueDocument({
      issue: issue({ homeBlocks: withLayout(ids.opening, "fullscreen") }),
      articles,
      maps: [],
      courses: [],
      issueNumber: "00",
    });

    expect(document.sections[0]).toMatchObject({ layout: "fullscreen", layoutFallback: false });
  });

  it("falls back to the standard layout and warns when there is no photo", () => {
    const document = buildPrintIssueDocument({
      issue: issue({ homeBlocks: withLayout(ids.rupture, "fullscreen") }),
      articles,
      maps: [],
      courses: [],
      issueNumber: "00",
    });
    const rupture = document.sections.find(
      (section) => section.kind === "article" && section.role === "rupture",
    );

    expect(rupture).toMatchObject({ layout: "default", layoutFallback: true });
    expect(inspectPrintIssueDocument(document).map((entry) => entry.code)).toContain(
      "fullscreen-without-image",
    );
  });
});

describe("buildPrintIssueDocument maps", () => {
  const blocksWithMap = (printSettings?: {
    showInIssueIntro: boolean;
    stopWithSiteCta: boolean;
    excludeFromPrint: boolean;
    showEndLogo: boolean;
  }) => [
    ...issue().homeBlocks!.slice(0, 1),
    { id: "m", type: "map" as const, mapId: map.id, printSettings },
  ];

  it("places the map in home block order with numbered entries sorted by position", () => {
    const document = buildPrintIssueDocument({
      issue: issue({ homeBlocks: blocksWithMap() }),
      articles,
      maps: [map],
      courses: [],
      issueNumber: "00",
    });
    const section = document.sections[1];

    expect(document.sections.map((entry) => entry.kind)).toEqual(["article", "map"]);
    expect(section).toMatchObject({
      kind: "map",
      anchor: "print-map-m",
      label: "Mappatura",
    });
    expect(
      section?.kind === "map" && section.entries.map((entry) => [entry.label, entry.title]),
    ).toEqual([
      ["01", "Primo ente"],
      ["02", "Secondo ente"],
    ]);
    expect(section?.kind === "map" && section.sitePath).toBe("/uscite/numero-zero#issue-block-m");
    expect(
      section?.kind === "map" &&
        section.entries[0]?.excerpt.map((run) => run.text.replaceAll("\u00ad", "")).join(""),
    ).toBe("Sacca, Modena sito");
  });

  it("honours the block print settings", () => {
    const excluded = buildPrintIssueDocument({
      issue: issue({
        homeBlocks: blocksWithMap({
          showInIssueIntro: false,
          stopWithSiteCta: false,
          excludeFromPrint: true,
          showEndLogo: false,
        }),
      }),
      articles,
      maps: [map],
      courses: [],
      issueNumber: "00",
    });
    const highlighted = buildPrintIssueDocument({
      issue: issue({
        homeBlocks: blocksWithMap({
          showInIssueIntro: true,
          stopWithSiteCta: true,
          excludeFromPrint: false,
          showEndLogo: false,
        }),
      }),
      articles,
      maps: [map],
      courses: [],
      issueNumber: "00",
    });

    expect(excluded.sections.map((entry) => entry.kind)).toEqual(["article"]);
    expect(highlighted.sections[1]).toMatchObject({ stopWithSiteCta: true });
    expect(highlighted.cover.highlights.map((entry) => entry.label)).toEqual(["Mappatura"]);
  });
});

describe("inspectPrintIssueDocument", () => {
  it("reports empty specials and unsupported content", () => {
    const document = buildPrintIssueDocument({
      issue: issue(),
      articles: articles.map((item) =>
        item.id === ids.opening
          ? { ...item, contentRich: { type: "doc", content: [{ type: "codeBlock" }] } }
          : item,
      ),
      maps: [],
      courses: [],
      issueNumber: "00",
    });

    expect(inspectPrintIssueDocument(document).map((entry) => entry.code)).toEqual([
      "empty-article",
      "unsupported-content",
    ]);
  });

  it("reports a missing special sequence and cover image", () => {
    const document = buildPrintIssueDocument({
      issue: issue({ homeBlocks: [] }),
      articles,
      maps: [],
      courses: [],
      issueNumber: "00",
    });

    expect(inspectPrintIssueDocument(document).map((entry) => entry.code)).toEqual([
      "missing-sections",
      "missing-cover-image",
    ]);
  });
});

const course: PrintCourseSource = {
  id: "00000000-0000-4000-8000-0000000000cc",
  slug: "operaismo-politico-italiano",
  title: "Operaismo politico italiano",
  titleStyled: null,
  description: content("Genealogia, concetti e attualità"),
  lessons: [
    {
      id: "lesson-b",
      title: "Genealogia e lessico",
      status: "PUBLISHED",
      sortOrder: 1,
      excerptRich: null,
      excerpt: "Secondo incontro",
      contentRich: content("Testo del secondo incontro"),
    },
    {
      id: "lesson-a",
      title: "Contesto e origini",
      status: "PUBLISHED",
      sortOrder: 0,
      excerptRich: content("Primo incontro"),
      excerpt: null,
      contentRich: content("Testo del primo incontro"),
    },
    {
      id: "lesson-c",
      title: "Archiviato",
      status: "ARCHIVED",
      sortOrder: 2,
      excerptRich: null,
      excerpt: null,
      contentRich: null,
    },
  ],
};

describe("buildPrintIssueDocument courses", () => {
  it("prints the course block with its meetings, in order, and the course page link", () => {
    const document = buildPrintIssueDocument({
      issue: issue({ homeBlocks: [{ id: "k", type: "course", courseId: course.id }] }),
      articles,
      maps: [],
      courses: [course],
      issueNumber: "N. 00",
    });
    const section = document.sections[0];

    expect(document.campaign).toBe("numero-zero");
    expect(section).toMatchObject({
      kind: "course",
      anchor: "print-course-k",
      label: "Contro-formazione",
      sitePath: "/contro-formazione/operaismo-politico-italiano",
    });
    expect(
      section?.kind === "course" &&
        section.lessons.map((lesson) => [
          lesson.label,
          lesson.title,
          lesson.lead.map((run) => run.text.replaceAll("\u00ad", "")).join(""),
        ]),
    ).toEqual([
      ["01", "Contesto e origini", "Primo incontro"],
      ["02", "Genealogia e lessico", "Secondo incontro"],
    ]);
  });
});
