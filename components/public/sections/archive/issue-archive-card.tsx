import Link from "next/link";

import { publicInteraction, publicTypography } from "@/components/public/primitives";
import { StyledTitle } from "@/components/public/styled-title";
import { formatIssueMonthYearLong } from "@/lib/public/format/issue";
import { cn } from "@/lib/utils";

import type { ArchiveIssueViewModel } from "@/components/public/sections/archive/archive-view-model";

type IssueArchiveCardProps = {
  issue: ArchiveIssueViewModel;
  countLabel: (count: number) => string;
};

export function IssueArchiveCard({ issue, countLabel }: IssueArchiveCardProps) {
  const publishedAtLabel = formatIssueMonthYearLong(issue.publishedAt);

  return (
    <Link
      href={`/uscite/${issue.slug}`}
      className={cn(
        publicInteraction.cardSurface,
        "relative isolate block overflow-hidden border-2 border-foreground bg-background px-5 py-7 sm:px-6 sm:py-9 md:px-8 md:py-10 lg:px-10 lg:py-12",
      )}
    >
      <span
        className={`${publicTypography.issueBackgroundNumber} pointer-events-none absolute top-5 right-5 -z-10 text-accent/15 select-none [-webkit-text-stroke:0.45px_rgba(0,0,0,0.25)]`}
        aria-hidden
      >
        {issue.issueNumber}
      </span>

      <div className="relative z-10 w-full">
        <h3 className={`${publicTypography.homeHeroTitle} w-full text-foreground`}>
          <StyledTitle title={issue.title} titleStyled={issue.titleStyled} />
        </h3>

        <div className="mt-8 w-full border-t-2 border-foreground pt-5">
          {issue.descriptionPlain ? (
            <p className="font-editorial text-[clamp(18px,1.8vw,25px)] leading-[1.36] text-body-text italic">
              {issue.descriptionPlain}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3 font-heading text-[13px] font-semibold text-muted sm:text-[14px]">
            <span>{issue.issueNumber}</span>
            <span className="size-1 rounded-[1px] bg-accent" aria-hidden />
            <span>{publishedAtLabel}</span>
            <span className="size-1 rounded-[1px] bg-accent" aria-hidden />
            <span>{countLabel(issue.articlesCount)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
