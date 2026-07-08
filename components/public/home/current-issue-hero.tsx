import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { i18n } from "@/lib/i18n";
import { formatIssueMonthYearLong } from "@/lib/public/format/issue";

import type { PublicCurrentIssueDetail } from "@/lib/public/types/issues";

type CurrentIssueHeroProps = {
  issue: PublicCurrentIssueDetail;
  description: string | null;
  issueNumber: string;
};

function getArticleCountLabel(count: number) {
  return i18n.public.labels.articleCount(count);
}

function IssueMetaRail({ issue }: Pick<CurrentIssueHeroProps, "issue">) {
  const audioCount = issue.articles.filter((article) => article.hasAudio).length;
  const metaItems = [
    { key: "date", label: formatIssueMonthYearLong(issue.publishedAt) },
    { key: "count", label: getArticleCountLabel(issue.articles.length) },
    audioCount > 0
      ? { key: "audio", label: i18n.public.home.dossier.audioCountLabel(audioCount) }
      : null,
  ].filter((item) => item !== null);

  return <PublicMetaRail items={metaItems} />;
}

export function CurrentIssueHero({ issue, description, issueNumber }: CurrentIssueHeroProps) {
  return (
    <PublicPageHero
      title={issue.title}
      titleStyled={issue.titleStyled}
      backgroundCode={issueNumber}
      description={description}
      meta={<IssueMetaRail issue={issue} />}
    />
  );
}
