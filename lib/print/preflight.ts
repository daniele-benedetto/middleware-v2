import { printFormats } from "@/lib/print/format";
import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { PrintIssueDocument } from "@/lib/print/issue-document";

export type PrintPreflightIssue = {
  code:
    | "missing-sections"
    | "missing-cover-image"
    | "empty-article"
    | "unsupported-content"
    | "empty-map"
    | "crowded-map"
    | "crowded-toc"
    | "empty-course"
    | "fullscreen-without-image";
  message: string;
};

const unsupportedNodeLabels: Record<string, string> = {
  noteReference: "note bibliografiche",
  table: "tabelle",
  codeBlock: "blocchi di codice",
};

function collectUnsupportedNodes(value: unknown, found: Set<string>) {
  if (!value || typeof value !== "object") return;

  const node = value as { type?: unknown; content?: unknown };
  const label = typeof node.type === "string" ? unsupportedNodeLabels[node.type] : undefined;
  if (label) found.add(label);
  if (Array.isArray(node.content))
    node.content.forEach((child) => collectUnsupportedNodes(child, found));
}

export function inspectPrintIssueDocument(document: PrintIssueDocument): PrintPreflightIssue[] {
  const issues: PrintPreflightIssue[] = [];
  const { tocCapacity } = printFormats[document.format];

  if (document.sections.length === 0) {
    issues.push({
      code: "missing-sections",
      message: "Nessun contenuto assegnato ai blocchi stampabili (articoli o mappe).",
    });
  }

  if (!document.cover.image) {
    issues.push({ code: "missing-cover-image", message: "La copertina non ha un’immagine." });
  }

  if (document.sections.length > tocCapacity) {
    issues.push({
      code: "crowded-toc",
      message: `L’indice ha ${document.sections.length} voci: ne entrano ${tocCapacity} in una pagina.`,
    });
  }

  for (const section of document.sections) {
    if (section.kind === "map") {
      if (section.entries.length === 0) {
        issues.push({
          code: "empty-map",
          message: `La mappa “${section.plainTitle}” non ha punti da stampare.`,
        });
      } else if (!section.stopWithSiteCta && section.directory.excerptLines < 2) {
        issues.push({
          code: "crowded-map",
          message: `La mappa “${section.plainTitle}” ha troppi punti per una sola pagina di schede.`,
        });
      }
      continue;
    }

    if (section.kind === "course") {
      if (section.lessons.length === 0) {
        issues.push({
          code: "empty-course",
          message: `La contro-formazione “${section.plainTitle}” non ha incontri da stampare.`,
        });
      }
      continue;
    }

    const article = section;
    if (article.layoutFallback) {
      issues.push({
        code: "fullscreen-without-image",
        message: `“${article.plainTitle}” è in full screen ma non ha un’immagine: stampato con il layout standard.`,
      });
    }
    if (!extractPlainText(article.content)) {
      issues.push({
        code: "empty-article",
        message: `“${article.plainTitle}” non contiene testo stampabile.`,
      });
    }

    const unsupported = new Set<string>();
    collectUnsupportedNodes(article.content, unsupported);
    if (unsupported.size > 0) {
      issues.push({
        code: "unsupported-content",
        message: `“${article.plainTitle}” contiene ${[...unsupported].join(", ")}, esclusi dalla stampa.`,
      });
    }
  }

  return issues;
}
