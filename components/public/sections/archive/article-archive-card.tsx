import { PublicMetaRail } from "@/components/public/compounds";
import { publicInteraction, publicTypography } from "@/components/public/primitives";
import { StyledTitle } from "@/components/public/styled-title";
import { TrackedPublicLink } from "@/components/public/tracked-public-link";
import { i18n } from "@/lib/i18n";
import { publicAnalyticsEvents } from "@/lib/public/analytics";
import { cn } from "@/lib/utils";

import type { PublicArticleSummaryDto } from "@/lib/server/modules/articles/dto/public";

type ArticleArchiveCardProps = {
  article: PublicArticleSummaryDto;
  number: number;
  position: number;
};

function formatArchiveNumber(value: number) {
  return String(value).padStart(2, "0");
}

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(new Date(value));
}

export function ArticleArchiveCard({ article, number, position }: ArticleArchiveCardProps) {
  const text = i18n.public.home.articleCard;
  const metaItems = [
    article.categoryName,
    article.authorName,
    formatArchiveDate(article.publishedAt),
    article.hasAudio ? text.audioLabel : null,
  ]
    .filter((label): label is string => Boolean(label))
    .map((label, index) => ({ key: `${label}-${index}`, label }));

  return (
    <TrackedPublicLink
      href={`/articoli/${article.slug}`}
      analyticsEventName={publicAnalyticsEvents.contentCardClick}
      analyticsEventData={{
        content_type: "article",
        slug: article.slug,
        source: "articles-archive",
        position: String(position),
      }}
      className={cn(
        "flex flex-col gap-4 border-foreground p-6 md:border-r md:border-b lg:p-8",
        publicInteraction.cardSurface,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={publicTypography.articleNumberLg}>{formatArchiveNumber(number)}</span>
        <span className={cn(publicTypography.smallKicker, "max-w-[60%] text-right text-muted")}>
          {article.issueTitle}
        </span>
      </div>

      <h3 className={cn(publicTypography.issueCardTitle, "text-[clamp(22px,2.2vw,30px)]")}>
        <StyledTitle title={article.title} titleStyled={article.titleStyled} />
      </h3>

      {article.excerpt ? (
        <p className={cn(publicTypography.editorialSmall, "text-body-text")}>{article.excerpt}</p>
      ) : null}

      <PublicMetaRail
        items={metaItems}
        className={cn(
          "mt-auto flex flex-wrap items-center gap-3 pt-2",
          publicTypography.meta,
          "text-muted",
        )}
      />
    </TrackedPublicLink>
  );
}
