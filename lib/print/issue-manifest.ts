import type { PrintEditionManifestInput } from "@/lib/print/edition-schema";
import type { PrintEditionManifest, PrintSequenceItem } from "@/lib/print/manifest";

export type PrintIssueManifestSource = {
  issueId: string;
  issueNumber: string;
  title: string;
  articles: Array<{
    id: string;
    title: string;
    readingTimeMinutes: number;
  }>;
  courses?: Array<{ id: string; title: string }>;
  maps?: Array<{ id: string; title: string }>;
  questionnaireAnalyses?: Array<{ id: string; title: string }>;
  homeBlocks?: Array<
    | { type: "opening" | "body" | "rupture" | "closing"; articleIds: string[] }
    | { type: "course"; courseId: string | null }
    | { type: "map"; mapId: string | null }
    | { type: "questionnaireAnalysis"; questionnaireId: string | null }
    | { type: "preview"; previewIssueId: string | null }
  >;
};

const WORDS_PER_MINUTE = 220;

export function buildPrintEditionManifest(source: PrintIssueManifestSource): PrintEditionManifest {
  const articlesById = new Map(source.articles.map((article) => [article.id, article]));
  const coursesById = new Map((source.courses ?? []).map((course) => [course.id, course]));
  const mapsById = new Map((source.maps ?? []).map((map) => [map.id, map]));
  const analysesById = new Map(
    (source.questionnaireAnalyses ?? []).map((analysis) => [analysis.id, analysis]),
  );
  const usedIds = new Set<string>();
  const articleItems = (
    ids: string[],
    section: "opening" | "body" | "rupture" | "closing",
  ): PrintSequenceItem[] =>
    ids.flatMap((id, index) => {
      const article = articlesById.get(id);
      if (!article || usedIds.has(id)) return [];
      usedIds.add(id);
      return [
        {
          id: article.id,
          kind: "article" as const,
          title: article.title,
          section,
          estimatedWords: article.readingTimeMinutes * WORDS_PER_MINUTE,
          preferredFamily:
            section === "opening" ? ("article-opener" as const) : ("text-spread" as const),
          startsOnRight: section === "opening" && index === 0,
        },
      ];
    });

  const configuredItems: PrintSequenceItem[] = (source.homeBlocks ?? []).flatMap((block) => {
    if (block.type === "preview") return [];
    if (
      block.type === "opening" ||
      block.type === "body" ||
      block.type === "rupture" ||
      block.type === "closing"
    ) {
      return articleItems(block.articleIds, block.type);
    }
    if (block.type === "course") {
      const course = block.courseId ? coursesById.get(block.courseId) : undefined;
      return course
        ? [
            {
              id: course.id,
              kind: "course" as const,
              title: course.title,
              section: "special" as const,
              estimatedWords: 0,
              preferredFamily: "course-section" as const,
            },
          ]
        : [];
    }
    if (block.type === "map") {
      const map = block.mapId ? mapsById.get(block.mapId) : undefined;
      return map
        ? [
            {
              id: map.id,
              kind: "map" as const,
              title: map.title,
              section: "special" as const,
              estimatedWords: 0,
              preferredFamily: "map-plate" as const,
            },
          ]
        : [];
    }
    if (block.type !== "questionnaireAnalysis") return [];
    const analysis = block.questionnaireId ? analysesById.get(block.questionnaireId) : undefined;
    return analysis
      ? [
          {
            id: analysis.id,
            kind: "questionnaireAnalysis" as const,
            title: analysis.title,
            section: "special" as const,
            estimatedWords: 0,
            preferredFamily: "questionnaire-analysis" as const,
          },
        ]
      : [];
  });

  const fallbackItems: PrintSequenceItem[] = source.articles
    .filter((article) => !usedIds.has(article.id))
    .map((article) => articleItems([article.id], "body")[0])
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    issueId: source.issueId,
    title: source.title,
    issueNumber: source.issueNumber,
    format: "a4-portrait",
    pageCountMultiple: 4,
    items: [
      {
        id: `${source.issueId}:opener`,
        kind: "issue",
        title: source.title,
        section: "opening",
        estimatedWords: 0,
        preferredFamily: "issue-opener",
      },
      ...configuredItems,
      ...fallbackItems,
    ],
  };
}

export function applyPrintEditionOverrides(
  manifest: PrintEditionManifest,
  input: Pick<PrintEditionManifestInput, "overrides">,
): PrintEditionManifest {
  const overrides = new Map(input.overrides.map((override) => [override.itemId, override]));
  return {
    ...manifest,
    items: manifest.items.flatMap((item) => {
      const override = overrides.get(item.id);
      if (override?.excluded) return [];
      return [
        {
          ...item,
          preferredFamily: override?.preferredFamily ?? item.preferredFamily,
          lockedPage: override?.lockedPage ?? item.lockedPage,
          selectedImageUrl: override?.selectedImageUrl ?? item.selectedImageUrl,
        },
      ];
    }),
  };
}
