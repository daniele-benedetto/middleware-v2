import Link from "next/link";

import { HomeSectionHeader } from "@/components/public/home/home-section-header";
import { getIssuePlainDescription } from "@/components/public/home/home-view-model";
import { formatIssueSeasonLong } from "@/lib/public/format/issue";

import type { PublicIssueListItem } from "@/lib/public/server/issues";

type ArchiveSectionProps = {
  title: string;
  description: string;
  issues: PublicIssueListItem[];
  countLabel: (count: number) => string;
  cta: string;
};

export function ArchiveSection({
  title,
  description,
  issues,
  countLabel,
  cta,
}: ArchiveSectionProps) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <section id="archivio" className="scroll-mt-20 px-4 py-12 sm:px-6 lg:px-12 lg:py-14">
      <HomeSectionHeader title={title} description={description} />
      <div className="grid border-l border-foreground [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        {issues.map((issue) => {
          const issueDescription = getIssuePlainDescription(issue);

          return (
            <Link
              key={issue.id}
              href={`/uscite/${issue.slug}`}
              className="flex flex-col border-r border-b border-foreground px-6.5 py-6 transition-[background,box-shadow] duration-(--motion-fast) hover:bg-surface-hover hover:shadow-[var(--interactive-rail-shadow)]"
            >
              <div className="mb-4.5 flex items-center justify-between">
                <span className="font-heading text-[13px] font-extrabold tracking-[0.08em] text-accent uppercase">
                  {formatIssueSeasonLong(issue.publishedAt)}
                </span>
                <div className="grid grid-cols-2 gap-0.75" aria-hidden>
                  <span className="size-2.75 rounded-[2px] bg-accent" />
                  <span className="size-2.75 rounded-[2px] bg-foreground" />
                  <span className="size-2.75 rounded-[2px] bg-foreground" />
                  <span className="size-2.75 rounded-[2px] bg-accent" />
                </div>
              </div>
              <h3 className="font-heading text-[21px] leading-[1.12] font-bold tracking-[-0.02em]">
                {issue.title}
              </h3>
              {issueDescription ? (
                <p className="mt-3 font-editorial text-[15px] leading-normal text-body-text">
                  {issueDescription}
                </p>
              ) : null}
              <div className="mt-auto flex flex-wrap items-center gap-2.75 border-t border-[rgba(17,17,17,0.18)] pt-5.5 font-heading text-xs font-semibold text-muted">
                <span>{formatIssueSeasonLong(issue.publishedAt)}</span>
                <span className="size-0.75 rounded-[1px] bg-muted" aria-hidden />
                <span>{countLabel(issue.articlesCount)}</span>
                <span className="ml-auto font-bold text-accent">{cta}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
