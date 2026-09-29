import { extractPrintReadingBlocks } from "@/lib/print/reading-blocks";

import type { EditionComposition, EditionArticle } from "@/lib/print/compose-edition";
import type { PrintEditionManifest } from "@/lib/print/manifest";

export type PrintPreflightSeverity = "error" | "warning" | "info";

export type PrintPreflightCode =
  | "missing-title"
  | "missing-content"
  | "unsupported-rich-text"
  | "missing-article"
  | "special-asset-needed"
  | "page-count-padded"
  | "empty-page";

export type PrintPreflightIssue = {
  severity: PrintPreflightSeverity;
  code: PrintPreflightCode;
  itemId: string;
  message: string;
};

export type PrintPreflightInput = {
  manifest: PrintEditionManifest;
  composition: EditionComposition;
  articles: EditionArticle[];
};

export type PrintPreflightResult = {
  issues: PrintPreflightIssue[];
  blocking: boolean;
};

export function runPrintPreflight({
  manifest,
  composition,
  articles,
}: PrintPreflightInput): PrintPreflightResult {
  const issues: PrintPreflightIssue[] = [];
  const articlesById = new Map(articles.map((article) => [article.id, article]));

  for (const item of manifest.items) {
    if (!item.title.trim()) {
      issues.push({
        severity: "error",
        code: "missing-title",
        itemId: item.id,
        message: "Elemento senza titolo.",
      });
    }

    if (item.kind === "article") {
      const article = articlesById.get(item.id);
      if (!article) {
        issues.push({
          severity: "error",
          code: "missing-article",
          itemId: item.id,
          message: `L’articolo “${item.title}” non è disponibile nel contenuto dell’edizione.`,
        });
        continue;
      }

      const { blocks, unsupported } = extractPrintReadingBlocks(article.contentRich);
      if (blocks.length === 0) {
        issues.push({
          severity: "error",
          code: "missing-content",
          itemId: item.id,
          message: `L’articolo “${item.title}” non contiene blocchi stampabili.`,
        });
      }
      for (const feature of unsupported) {
        issues.push({
          severity: "warning",
          code: "unsupported-rich-text",
          itemId: item.id,
          message: `L’articolo “${item.title}” contiene ${feature}.`,
        });
      }
    }

    if (["map", "questionnaireAnalysis"].includes(item.kind)) {
      issues.push({
        severity: "warning",
        code: "special-asset-needed",
        itemId: item.id,
        message: `Il contenuto speciale “${item.title}” richiede un asset statico editoriale.`,
      });
    }
  }

  for (const page of composition.pages) {
    if (page.family === "blank") {
      issues.push({
        severity: "info",
        code: "page-count-padded",
        itemId: page.itemId,
        message: `Pagina ${page.number}: pagina bianca aggiunta per chiudere il fascicolo.`,
      });
    }
    if (
      [
        "article-opener",
        "article-continuation",
        "text-spread",
        "text-image",
        "image-spread",
      ].includes(page.family) &&
      page.blocks.length === 0
    ) {
      issues.push({
        severity: "warning",
        code: "empty-page",
        itemId: page.itemId,
        message: `Pagina ${page.number}: nessun blocco stampabile composto.`,
      });
    }
  }

  return {
    issues,
    blocking: issues.some((issue) => issue.severity === "error"),
  };
}
