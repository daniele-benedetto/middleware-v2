export const PRINT_PAGE_FAMILIES = [
  "cover",
  "colophon",
  "index",
  "issue-opener",
  "article-opener",
  "article-continuation",
  "text-spread",
  "text-image",
  "image-spread",
  "rupture",
  "course-section",
  "map-plate",
  "questionnaire-analysis",
  "closing",
  "blank",
] as const;

export type PrintPageFamily = (typeof PRINT_PAGE_FAMILIES)[number];

export type PrintSequenceItem = {
  id: string;
  kind: "issue" | "article" | "course" | "map" | "questionnaireAnalysis" | "preview";
  title: string;
  section: "opening" | "body" | "rupture" | "closing" | "special";
  estimatedWords: number;
  preferredFamily: PrintPageFamily;
  startsOnRight?: boolean;
  lockedPage?: number;
  selectedImageUrl?: string | null;
};

export type PrintEditionManifest = {
  issueId: string;
  title: string;
  issueNumber: string;
  format: "a4-portrait";
  pageCountMultiple: 4;
  items: PrintSequenceItem[];
};

export type PrintPaginationDiagnostic = {
  severity: "warning" | "error";
  code: "locked-page-conflict" | "missing-title" | "empty-content" | "unbalanced-last-page";
  itemId: string;
  message: string;
};

export type PrintPlannedPage = {
  page: number;
  family: PrintPageFamily;
  itemId: string;
  itemTitle: string;
  continuation: boolean;
};

export type PrintPaginationResult = {
  pages: PrintPlannedPage[];
  diagnostics: PrintPaginationDiagnostic[];
};
