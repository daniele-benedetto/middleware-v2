import { getIssuePlainDescription } from "@/components/public/home/home-view-model";
import { buildIssueNumberMap, formatIssueNumber } from "@/lib/public/format/issue";

import type { PublicIssueListItem } from "@/lib/public/types/issues";

export type ArchiveIssueViewModel = PublicIssueListItem & {
  descriptionPlain: string | null;
  issueNumber: string;
};

export function getArchiveIssueViewModels(issues: PublicIssueListItem[]): ArchiveIssueViewModel[] {
  const issueNumbers = buildIssueNumberMap(issues);

  return issues.map((issue) => ({
    ...issue,
    descriptionPlain: getIssuePlainDescription(issue),
    issueNumber: issueNumbers.get(issue.id) ?? formatIssueNumber(0),
  }));
}
