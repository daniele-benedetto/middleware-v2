import { StyledTitle } from "@/components/public/styled-title";

import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";

type CurrentIssueHeroProps = {
  issue: PublicCurrentIssueDetail;
  description: string | null;
  issueLabel: string;
};

export function CurrentIssueHero({ issue, description, issueLabel }: CurrentIssueHeroProps) {
  return (
    <section className="w-full px-4 pt-8 pb-8 sm:px-6 sm:pt-10 md:pt-12 lg:px-12 lg:pb-10">
      <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-[6px] bg-accent px-3 py-1.5 font-heading text-[11px] font-extrabold tracking-[0.12em] text-background uppercase sm:mb-6 sm:text-xs">
        <span className="size-2 rounded-xs bg-background" aria-hidden />
        <span className="min-w-0 break-words">{issueLabel}</span>
      </div>
      <h1 className="max-w-[20ch] font-heading text-[clamp(38px,8.2vw,124px)] leading-[0.94] font-black tracking-[-0.038em] text-foreground sm:leading-[0.92]">
        <StyledTitle title={issue.title} titleStyled={issue.titleStyled} />
      </h1>
      {description ? (
        <div className="mt-8 border-t border-foreground pt-6">
          <p className="w-full font-editorial text-[clamp(17px,1.6vw,21px)] leading-normal text-body-text">
            {description}
          </p>
        </div>
      ) : null}
    </section>
  );
}
