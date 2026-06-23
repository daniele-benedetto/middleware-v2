import { publicContentClassName } from "@/components/public/primitives";
import { IssueArchiveCard } from "@/components/public/sections/archive/issue-archive-card";

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
    <section className="scroll-mt-20 py-10 lg:py-12">
      <div className={publicContentClassName}>
        <div className="grid gap-8 lg:gap-10">
          {issues.map((issue, index) => (
            <IssueArchiveCard
              key={issue.id}
              issue={issue}
              countLabel={countLabel}
              variant={variants[index % variants.length]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
