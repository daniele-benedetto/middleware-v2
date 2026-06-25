import { IssueArchiveCard } from "@/components/public/sections/archive/issue-archive-card";
import { IssuesArchiveRail } from "@/components/public/sections/archive/issues-archive-rail";
import { i18n } from "@/lib/i18n";

import type { ArchiveIssueViewModel } from "@/components/public/sections/archive/archive-view-model";

type IssuesArchiveGridProps = {
  issues: ArchiveIssueViewModel[];
  countLabel: (count: number) => string;
};

export function IssuesArchiveGrid({ issues, countLabel }: IssuesArchiveGridProps) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <>
      <h2 className="sr-only">{i18n.public.issuesArchive.railAriaLabel}</h2>
      <IssuesArchiveRail ariaLabel={i18n.public.issuesArchive.railAriaLabel}>
        {issues.map((issue) => (
          <IssueArchiveCard
            key={issue.id}
            issue={issue}
            countLabel={countLabel}
            variant={issue.homeVariant}
            className="w-full lg:w-screen lg:shrink-0"
          />
        ))}
      </IssuesArchiveRail>
    </>
  );
}
