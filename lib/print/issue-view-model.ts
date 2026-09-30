import type {
  IssueHomeArticlePrintSettings,
  IssueHomeBlockPrintSettings,
  IssueHomeBlocks,
} from "@/lib/server/modules/issues/schema";

export type IssuePrintArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  authorName: string | null;
  categoryName: string | null;
  contentRich: unknown;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageSettings?: unknown;
};

export type IssuePrintArticleItem = {
  kind: "article";
  article: IssuePrintArticle;
  type: "opening" | "body" | "rupture" | "closing";
  printSettings: IssueHomeArticlePrintSettings;
  page: number;
};

export type IssuePrintSpecialItem = {
  kind: "special";
  id: string;
  type: "course" | "map" | "questionnaireAnalysis" | "preview";
  resourceId: string | null;
  printSettings: IssueHomeBlockPrintSettings;
  page: number;
};

export type IssuePrintItem = IssuePrintArticleItem | IssuePrintSpecialItem;

function resolvePrintSettings(
  settings: IssueHomeArticlePrintSettings | undefined,
): IssueHomeArticlePrintSettings {
  return {
    showInIssueIntro: settings?.showInIssueIntro ?? false,
    stopWithSiteCta: settings?.stopWithSiteCta ?? false,
    excludeFromPrint: settings?.excludeFromPrint ?? false,
  };
}

function resourceIdForBlock(block: Exclude<IssueHomeBlocks[number], { articleIds: string[] }>) {
  switch (block.type) {
    case "course":
      return block.courseId;
    case "map":
      return block.mapId;
    case "questionnaireAnalysis":
      return block.questionnaireId;
    case "preview":
      return block.previewIssueId;
  }
}

export function buildIssuePrintSequence(
  blocks: IssueHomeBlocks | null | undefined,
  articles: IssuePrintArticle[],
) {
  const articleById = new Map(articles.map((article) => [article.id, article]));
  const assignedIds = new Set<string>();
  const sequence: Array<Omit<IssuePrintArticleItem, "page"> | Omit<IssuePrintSpecialItem, "page">> =
    [];

  for (const block of blocks ?? []) {
    if ("articleIds" in block) {
      for (const id of block.articleIds) {
        if (assignedIds.has(id)) continue;
        const article = articleById.get(id);
        if (!article) continue;
        assignedIds.add(id);
        const printSettings = resolvePrintSettings(block.printSettings?.[id]);
        if (!printSettings.excludeFromPrint) {
          sequence.push({ kind: "article", article, type: block.type, printSettings });
        }
      }
      continue;
    }
    const printSettings = resolvePrintSettings(block.printSettings);
    if (!printSettings.excludeFromPrint && resourceIdForBlock(block)) {
      sequence.push({
        kind: "special",
        id: block.id,
        type: block.type,
        resourceId: resourceIdForBlock(block),
        printSettings,
      });
    }
  }

  for (const article of articles) {
    if (!assignedIds.has(article.id)) {
      sequence.push({
        kind: "article",
        article,
        type: "body",
        printSettings: resolvePrintSettings(undefined),
      });
    }
  }

  // One content item per page in this proof; the index and cover use the same page numbers.
  const items: IssuePrintItem[] = sequence.map((item, index) => ({ ...item, page: index + 3 }));
  const includedArticles = items.filter(
    (item): item is IssuePrintArticleItem => item.kind === "article",
  );
  const specialItems = items.filter(
    (item): item is IssuePrintSpecialItem => item.kind === "special",
  );

  return {
    items,
    articles: includedArticles,
    introArticles: includedArticles.filter((item) => item.printSettings.showInIssueIntro),
    partialArticles: includedArticles.filter((item) => item.printSettings.stopWithSiteCta),
    specialItems,
    introSpecialItems: specialItems.filter((item) => item.printSettings.showInIssueIntro),
  };
}
