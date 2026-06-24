import { IssueArchiveCard } from "@/components/public/sections/archive/issue-archive-card";
import { IssuesArchiveRail } from "@/components/public/sections/archive/issues-archive-rail";
import { i18n } from "@/lib/i18n";

import type { ArchiveIssueViewModel } from "@/components/public/sections/archive/archive-view-model";
import type { IssueArchiveCardVariant } from "@/components/public/sections/archive/issue-archive-card";

type IssuesArchiveGridProps = {
  issues: ArchiveIssueViewModel[];
  countLabel: (count: number) => string;
};

export function IssuesArchiveGrid({ issues, countLabel }: IssuesArchiveGridProps) {
  if (issues.length === 0) {
    return null;
  }

  const variants: IssueArchiveCardVariant[] = ["default", "red", "black"];

  return (
    <>
      <h2 className="sr-only">{i18n.public.issuesArchive.railAriaLabel}</h2>
      <IssuesArchiveRail ariaLabel={i18n.public.issuesArchive.railAriaLabel}>
        {issues.map((issue, index) => (
          <IssueArchiveCard
            key={issue.id}
            issue={issue}
            countLabel={countLabel}
            variant={variants[index % variants.length]}
            className="w-full lg:w-screen lg:shrink-0"
          />
        ))}
      </IssuesArchiveRail>
    </>
  );
}
