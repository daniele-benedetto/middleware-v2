import { ArticleCoverImage } from "@/components/public/article-cover-image";
import { ArticleMeta } from "@/components/public/compounds";
import {
  publicContentClassName,
  publicInteraction,
  publicTypography,
} from "@/components/public/primitives";
import {
  formatArticleNumber,
  getArticleNumber,
} from "@/components/public/sections/dossier/dossier-format";
import { getNarrativeVariantClasses } from "@/components/public/sections/dossier/dossier-variant";
import { StyledTitle } from "@/components/public/styled-title";
import { TrackedPublicLink } from "@/components/public/tracked-public-link";
import { publicAnalyticsEvents } from "@/lib/public/analytics";
import { cn } from "@/lib/utils";

import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";
import type { IssueHomeVariant } from "@/lib/server/modules/issues/schema";

type ClosingBlockProps = {
  block: NarrativeHomeBlock;
  variant: IssueHomeVariant;
  articleNumbers: Map<string, number>;
};

export function ClosingBlock({ block, variant, articleNumbers }: ClosingBlockProps) {
  const article = block.featuredArticle ?? block.articles[0];

  if (!article) {
    return null;
  }

  const variantClasses = getNarrativeVariantClasses(variant);
  const imageOnRight = block.featuredPlacement === "right";
  const articleHref = `/articoli/${article.slug}`;
  const titleId = `closing-article-title-${article.id}`;
  const imageCard = article.imageUrl ? (
    <TrackedPublicLink
      href={articleHref}
      analyticsEventName={publicAnalyticsEvents.contentCardClick}
      analyticsEventData={{
        content_type: "article",
        slug: article.slug,
        source: "dossier_closing",
        position: `article_${getArticleNumber(articleNumbers, article)}`,
      }}
      aria-label={article.title}
      className={cn(
        publicInteraction.cardBase,
        "relative min-h-60 overflow-hidden sm:min-h-72 md:min-h-full",
      )}
    >
      <ArticleCoverImage
        src={article.imageUrl}
        alt={article.imageAlt}
        settings={article.imageSettings}
        fill
        sizes="(min-width: 768px) 34vw, 100vw"
        forceCover
        className={cn(publicInteraction.imageZoom)}
      />
    </TrackedPublicLink>
  ) : null;
  const articleCard = (
    <TrackedPublicLink
      href={articleHref}
      analyticsEventName={publicAnalyticsEvents.contentCardClick}
      analyticsEventData={{
        content_type: "article",
        slug: article.slug,
        source: "dossier_closing",
        position: `article_${getArticleNumber(articleNumbers, article)}`,
      }}
      aria-labelledby={titleId}
      className={cn(
        publicInteraction.cardBase,
        variantClasses.section,
        "flex min-w-0 flex-col px-6 pt-6 pb-6 md:px-8 md:pt-7 md:pb-8",
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <span className={cn(publicTypography.articleNumberLg, variantClasses.titlePrimary)}>
          {formatArticleNumber(getArticleNumber(articleNumbers, article))}
        </span>
      </div>

      <h2 id={titleId} className={cn(publicTypography.closingArticleTitle, "w-full text-balance")}>
        <StyledTitle
          title={article.title}
          titleStyled={article.titleStyled}
          primaryClassName={variantClasses.titlePrimary}
        />
      </h2>

      {article.excerpt ? (
        <p
          className={cn(
            "mt-5 w-full font-editorial text-[18px] leading-[1.42] italic md:text-[21px]",
            variantClasses.excerpt,
          )}
        >
          {article.excerpt}
        </p>
      ) : null}
      <div className="mt-auto pt-7">
        <ArticleMeta article={article} tone={variantClasses.metaTone} />
      </div>
    </TrackedPublicLink>
  );

  return (
    <section className="scroll-mt-20 py-10 md:py-12">
      <div
        className={cn(
          publicContentClassName,
          imageCard ? "group grid gap-5 md:grid-cols-2 md:gap-8 lg:gap-10" : "max-w-2xl",
        )}
      >
        {imageCard ? (imageOnRight ? articleCard : imageCard) : articleCard}
        {imageCard ? (imageOnRight ? imageCard : articleCard) : null}
      </div>
    </section>
  );
}
