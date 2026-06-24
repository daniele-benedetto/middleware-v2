import { PublicMetaRail } from "@/components/public/compounds/public-meta-rail";
import { i18n } from "@/lib/i18n";

import type { HomeIssueArticle } from "@/components/public/home/home-view-model";

type ArticleMetaProps = {
  article: HomeIssueArticle;
  tone?: "light" | "dark" | "accent";
};

export function ArticleMeta({ article, tone = "light" }: ArticleMetaProps) {
  const text = i18n.public.home.articleCard;
  const muted =
    tone === "dark" ? "text-dark-muted" : tone === "accent" ? "text-cream-muted" : "text-muted";
  const separator = tone === "accent" ? "bg-foreground" : "bg-accent";
  const items = [
    article.categoryName,
    article.authorName,
    text.readingTimeLabel(article.readingTimeMinutes),
    article.hasAudio ? text.audioLabel : null,
  ]
    .filter((label): label is string => Boolean(label))
    .map((label, index) => ({ key: `${label}-${index}`, label }));

  return (
    <PublicMetaRail
      items={items}
      className={`flex flex-wrap items-center gap-3 font-heading text-xs font-semibold ${muted}`}
      separatorClassName={separator}
    />
  );
}
