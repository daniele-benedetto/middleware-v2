import { describe, expect, it } from "vitest";

import { buildLessonPageJsonLd } from "@/lib/seo";

import type { PublicLessonDetailDto } from "@/lib/server/modules/lessons/dto/public";

type JsonLdNode = Record<string, unknown>;

const lesson = {
  id: "33333333-3333-4333-8333-333333333333",
  slug: "genealogia-e-lessico",
  title: "Genealogia e lessico",
  titleStyled: null,
  excerpt: "Excerpt lezione",
  imageUrl: "/api/public/media/blob?pathname=lezione.jpg",
  imageAlt: "Alt lezione",
  hasAudio: true,
  sortOrder: 2,
  readingTimeMinutes: 12,
  publishedAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-05T00:00:00.000Z",
  courseId: "44444444-4444-4444-8444-444444444444",
  courseSlug: "operaismo-politico-italiano",
  courseTitle: "Operaismo politico italiano",
  excerptRich: null,
  contentRich: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Una lezione di prova." }] }],
  },
  audioUrl: null,
  audioChunks: null,
} satisfies PublicLessonDetailDto;

function getGraph(jsonLd: { "@graph": object[] }): JsonLdNode[] {
  return jsonLd["@graph"] as JsonLdNode[];
}

describe("lesson json-ld", () => {
  const graph = getGraph(buildLessonPageJsonLd(lesson, "Descrizione lezione"));

  it("emits website, organization, breadcrumb and lesson nodes", () => {
    expect(graph.map((node) => node["@type"])).toEqual([
      "WebSite",
      "NewsMediaOrganization",
      "BreadcrumbList",
      ["Article", "LearningResource"],
    ]);
  });

  it("nests the full course breadcrumb trail", () => {
    const breadcrumb = graph[2] as {
      itemListElement: { position: number; name: string; item: string }[];
    };

    expect(breadcrumb.itemListElement.map((item) => item.item)).toEqual([
      "http://localhost:3000/",
      "http://localhost:3000/contro-formazione",
      "http://localhost:3000/contro-formazione/operaismo-politico-italiano",
      "http://localhost:3000/contro-formazione/operaismo-politico-italiano/genealogia-e-lessico",
    ]);
  });

  it("carries dates, language, reading time and course membership", () => {
    expect(graph[3]).toMatchObject({
      headline: "Genealogia e lessico",
      description: "Descrizione lezione",
      datePublished: "2026-02-01T00:00:00.000Z",
      dateModified: "2026-02-05T00:00:00.000Z",
      inLanguage: "it-IT",
      isAccessibleForFree: true,
      timeRequired: "PT12M",
      wordCount: 4,
      position: 2,
      isPartOf: {
        "@type": "CreativeWorkSeries",
        name: "Operaismo politico italiano",
        url: "http://localhost:3000/contro-formazione/operaismo-politico-italiano",
      },
    });
  });

  it("routes the lesson image through the optimizer", () => {
    expect(graph[3]?.image).toBe(
      "http://localhost:3000/_next/image?url=%2Fapi%2Fpublic%2Fmedia%2Fblob%3Fpathname%3Dlezione.jpg&w=1200&q=75",
    );
  });
});
