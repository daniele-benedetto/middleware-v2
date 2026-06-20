import { StyledTitle } from "@/components/public/styled-title";

import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";

type CurrentIssueHeroProps = {
  issue: PublicCurrentIssueDetail;
  description: string | null;
  issueLabel: string;
};

export function CurrentIssueHero({ issue, description, issueLabel }: CurrentIssueHeroProps) {
  return (
    <section className="w-full px-4 pt-10 pb-5.5 sm:px-6 lg:px-12">
      <div className="mb-6 inline-flex items-center gap-2.25 rounded-[6px] bg-accent px-3.25 py-1.75 font-heading text-[12.5px] font-extrabold tracking-[0.12em] text-background uppercase">
        <span className="size-2 rounded-xs bg-background" aria-hidden />
        {issueLabel}
      </div>
      <h1 className="max-w-[20ch] font-heading text-[clamp(44px,8.2vw,124px)] leading-[0.92] font-black tracking-[-0.038em] text-foreground">
        <StyledTitle title={issue.title} titleStyled={issue.titleStyled} />
      </h1>
      {description ? (
        <div className="mt-7.5 border-t border-foreground pt-5.5">
          <p className="w-full font-editorial text-[clamp(17px,1.6vw,21px)] leading-normal text-body-text">
            {description}
          </p>
        </div>
      ) : null}
    </section>
  );
}
