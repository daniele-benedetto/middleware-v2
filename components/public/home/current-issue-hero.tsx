import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { StyledTitle } from "@/components/public/styled-title";
import { formatIssueMonthYearLong } from "@/lib/public/format/issue";

import type { PublicCurrentIssueDetail } from "@/lib/public/types/issues";

type CurrentIssueHeroProps = {
  issue: PublicCurrentIssueDetail;
  description: string | null;
  issueNumber: string;
};

function getArticleCountLabel(count: number) {
  return `${count} ${count === 1 ? "articolo" : "articoli"}`;
}

function IssueMetaRail({
  issue,
  issueNumber,
}: Pick<CurrentIssueHeroProps, "issue" | "issueNumber">) {
  const metaItems = [
    issueNumber,
    formatIssueMonthYearLong(issue.publishedAt),
    getArticleCountLabel(issue.articles.length),
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 font-heading text-[13px] font-semibold text-muted sm:text-[14px]">
      {metaItems.map((item, index) => (
        <span key={item} className="flex items-center gap-3">
          {index > 0 ? <span className="size-1 rounded-[1px] bg-accent" aria-hidden /> : null}
          {item}
        </span>
      ))}
    </div>
  );
}

export function CurrentIssueHero({ issue, description, issueNumber }: CurrentIssueHeroProps) {
  return (
    <section className="relative isolate w-full overflow-hidden border-b-2 border-foreground bg-background">
      <div className={`${publicContentClassName} relative py-7 sm:py-9 lg:py-14`}>
        <div
          className={`${publicTypography.issueBackgroundNumber} pointer-events-none absolute top-5 right-5 z-0 text-accent/15 select-none [-webkit-text-stroke:0.45px_rgba(0,0,0,0.25)]`}
          aria-hidden
        >
          {issueNumber}
        </div>

        <div className="relative z-10 w-full">
          <h1 className={`${publicTypography.homeHeroTitle} w-full text-foreground`}>
            <StyledTitle title={issue.title} titleStyled={issue.titleStyled} />
          </h1>
          {description ? (
            <div className="mt-8 w-full border-t-2 border-foreground pt-5">
              <p className="font-editorial text-[clamp(18px,1.8vw,25px)] leading-[1.36] text-body-text italic">
                {description}
              </p>
              <div className="mt-6">
                <IssueMetaRail issue={issue} issueNumber={issueNumber} />
              </div>
            </div>
          ) : (
            <div className="mt-7">
              <IssueMetaRail issue={issue} issueNumber={issueNumber} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
