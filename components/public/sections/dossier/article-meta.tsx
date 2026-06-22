import { i18n } from "@/lib/i18n";

import type { HomeIssueArticle } from "@/components/public/home/home-view-model";

type ArticleMetaProps = {
  article: HomeIssueArticle;
  tone?: "light" | "dark" | "accent";
};

export function ArticleMeta({ article, tone = "light" }: ArticleMetaProps) {
  const text = i18n.public.home.articleCard;
  const muted =
    tone === "dark" ? "text-dark-muted" : tone === "accent" ? "text-[#f4ebdd]/80" : "text-muted";
  const separator = tone === "accent" ? "bg-foreground" : "bg-accent";
  const items = [
    article.categoryName,
    article.authorName,
    text.readingTimeLabel(article.readingTimeMinutes),
    article.hasAudio ? text.audioLabel : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div
      className={`flex flex-wrap items-center gap-3 font-heading text-xs font-semibold ${muted}`}
    >
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="flex items-center gap-3">
          {index > 0 ? <span className={`size-1 rounded-[1px] ${separator}`} aria-hidden /> : null}
          {item}
        </span>
      ))}
    </div>
  );
}
