import { publicContentClassName } from "@/components/public/primitives";
import { IssueArchiveCard } from "@/components/public/sections/archive/issue-archive-card";

import type { ArchiveIssueViewModel } from "@/components/public/sections/archive/archive-view-model";

type IssuesArchiveGridProps = {
  issues: ArchiveIssueViewModel[];
  countLabel: (count: number) => string;
  cta: string;
};

export function IssuesArchiveGrid({ issues, countLabel, cta }: IssuesArchiveGridProps) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <section className="scroll-mt-20 py-10 lg:py-12">
      <div className={publicContentClassName}>
        <div className="grid gap-8 lg:gap-10">
          {issues.map((issue) => (
            <IssueArchiveCard key={issue.id} issue={issue} countLabel={countLabel} cta={cta} />
          ))}
        </div>
      </div>
    </section>
  );
}
