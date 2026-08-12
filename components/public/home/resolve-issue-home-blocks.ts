import { normalizeHomeBlock } from "@/lib/issues/home-block-rules";

import type {
  HomeIssueArticle,
  NarrativeHomeBlock,
  ResolvedHomeBlock,
} from "@/components/public/home/home-view-model";
import type { PublicCurrentIssueDetail } from "@/lib/public/types/issues";

function toNarrativeBlock({
  block,
  articles,
}: {
  block: Extract<
    NonNullable<PublicCurrentIssueDetail["homeBlocks"]>[number],
    { type: "opening" | "body" | "rupture" | "closing" }
  >;
  articles: HomeIssueArticle[];
}): NarrativeHomeBlock | null {
  const fallbackArticle = articles[0];

  if (!fallbackArticle) {
    return null;
  }

  const preferredArticle =
    (block.featuredArticleId
      ? articles.find((article) => article.id === block.featuredArticleId)
      : null) ?? fallbackArticle;

  return {
    id: block.id,
    type: block.type,
    articles,
    featuredArticle: preferredArticle,
    featuredPlacement: block.featuredPlacement,
  };
}

function resolveConfiguredBlocks(issue: PublicCurrentIssueDetail): ResolvedHomeBlock[] {
  const articlesById = new Map(issue.articles.map((article) => [article.id, article]));
  const coursesById = new Map(issue.courses.map((course) => [course.id, course]));
  const mapsById = new Map(issue.maps.map((map) => [map.id, map]));
  const manualArticleIds = new Set<string>();
  const blocks: ResolvedHomeBlock[] = [];

  for (const rawBlock of issue.homeBlocks ?? []) {
    if (rawBlock.type === "course") {
      const course = rawBlock.courseId ? coursesById.get(rawBlock.courseId) : null;

      if (course) {
        blocks.push({ id: rawBlock.id, type: "course", course });
      }

      continue;
    }

    if (rawBlock.type === "map") {
      const map = rawBlock.mapId ? mapsById.get(rawBlock.mapId) : null;

      if (map && map.items.length > 0) {
        blocks.push({ id: rawBlock.id, type: "map", map });
      }

      continue;
    }

    const block = normalizeHomeBlock(rawBlock);
    const articles = block.articleIds
      .filter((articleId) => !manualArticleIds.has(articleId))
      .map((articleId) => articlesById.get(articleId))
      .filter((article): article is HomeIssueArticle => Boolean(article));

    for (const article of articles) {
      manualArticleIds.add(article.id);
    }

    const narrativeBlock = toNarrativeBlock({ block, articles });

    if (narrativeBlock) {
      blocks.push(narrativeBlock);
    }
  }

  return blocks;
}

export function resolveIssueHomeBlocks(
  issue: PublicCurrentIssueDetail | null,
): ResolvedHomeBlock[] {
  if (!issue) {
    return [];
  }

  return resolveConfiguredBlocks(issue);
}
