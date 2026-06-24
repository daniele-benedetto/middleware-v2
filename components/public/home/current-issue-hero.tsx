import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
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
    { key: "issue", label: issueNumber },
    { key: "date", label: formatIssueMonthYearLong(issue.publishedAt) },
    { key: "count", label: getArticleCountLabel(issue.articles.length) },
  ];

  return <PublicMetaRail items={metaItems} />;
}

export function CurrentIssueHero({ issue, description, issueNumber }: CurrentIssueHeroProps) {
  return (
    <PublicPageHero
      title={issue.title}
      titleStyled={issue.titleStyled}
      backgroundCode={issueNumber}
      description={description}
      meta={<IssueMetaRail issue={issue} issueNumber={issueNumber} />}
    />
  );
}
