import { getIssuePlainDescription } from "@/components/public/home/home-view-model";
import { formatIssueNumber } from "@/lib/public/format/issue";

import type { PublicIssueListItem } from "@/lib/public/types/issues";

export type ArchiveIssueViewModel = Omit<PublicIssueListItem, "descriptionPlain"> & {
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
