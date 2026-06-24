import { getIssuePlainDescription } from "@/components/public/home/home-view-model";
import { formatIssueNumber } from "@/lib/public/format/issue";

import type { PublicIssueListItem } from "@/lib/public/types/issues";

// Extends the raw API item with two derived fields: a plain-text rendering of
// the rich `description` and the sequential, oldest-first issue number.
export type ArchiveIssueViewModel = PublicIssueListItem & {
  descriptionPlain: string | null;
  issueNumber: string;
};

export function getArchiveIssueViewModels(issues: PublicIssueListItem[]): ArchiveIssueViewModel[] {
  const oldestFirst = [...issues].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
  );
  const issueNumbers = new Map(
    oldestFirst.map((issue, index) => [issue.id, formatIssueNumber(index)]),
  );

  return issues.map((issue) => ({
    ...issue,
    descriptionPlain: getIssuePlainDescription(issue),
    issueNumber: issueNumbers.get(issue.id) ?? formatIssueNumber(0),
  }));
}
