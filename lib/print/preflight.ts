export type PrintPreflightSeverity = "error" | "warning";

export type PrintPreflightIssue = {
  code: "missing-image" | "failed-image" | "empty-article" | "missing-pages";
  severity: PrintPreflightSeverity;
  message: string;
};

export function inspectPrintDocument(root: ParentNode): PrintPreflightIssue[] {
  const issues: PrintPreflightIssue[] = [];

  for (const image of Array.from(root.querySelectorAll("img"))) {
    if (!image.getAttribute("src")) {
      issues.push({
        code: "missing-image",
        severity: "error",
        message: "Un’immagine non ha una sorgente valida.",
      });
    } else if (
      "complete" in image &&
      (!image.complete || ("naturalWidth" in image && image.naturalWidth === 0))
    ) {
      issues.push({
        code: "failed-image",
        severity: "error",
        message: "Un’immagine non è stata caricata correttamente.",
      });
    }
  }

  for (const article of Array.from(root.querySelectorAll("[data-article-id]"))) {
    if (!article.querySelector(".print-rich-text p, .print-rich-text h2, .print-rich-text h3")) {
      issues.push({
        code: "empty-article",
        severity: "warning",
        message: "Un articolo non contiene testo editoriale stampabile.",
      });
    }
  }

  return issues;
}
