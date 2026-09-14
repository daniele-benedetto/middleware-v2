import { ArticleCoverImage } from "@/components/public/article-cover-image";
import { ArticleMeta } from "@/components/public/compounds";
import { publicInteraction, publicTypography } from "@/components/public/primitives";
import { getNarrativeVariantClasses } from "@/components/public/sections/dossier/dossier-variant";
import { StyledTitle } from "@/components/public/styled-title";
import { TrackedPublicLink } from "@/components/public/tracked-public-link";
import { publicAnalyticsEvents } from "@/lib/public/analytics";
import { cn } from "@/lib/utils";

import type { PreviewHomeBlock as PreviewHomeBlockModel } from "@/components/public/home/home-view-model";
import type { CSSProperties } from "react";

type PreviewHomeBlockProps = {
  block: PreviewHomeBlockModel;
  priority?: boolean;
};

export function PreviewHomeBlock({ block, priority = false }: PreviewHomeBlockProps) {
  const { article, homeVariant } = block.previewIssue;
  const titleId = `preview-article-title-${article.id}`;
  const variantClasses = getNarrativeVariantClasses(homeVariant);

  return (
    <section className={`scroll-mt-20 my-10 md:my-12 ${variantClasses.section}`}>
      <div className="mx-auto w-full max-w-384 px-4 py-10 sm:px-6 md:py-12 lg:px-12">
        <TrackedPublicLink
          href={`/articoli/${article.slug}`}
          analyticsEventName={publicAnalyticsEvents.contentCardClick}
          analyticsEventData={{
            content_type: "article",
            slug: article.slug,
            source: "dossier_preview",
            position: "preview",
          }}
          aria-labelledby={titleId}
          data-page-reveal={priority ? "body" : undefined}
          style={priority ? ({ "--page-reveal-delay": "660ms" } as CSSProperties) : undefined}
          className={cn(
            publicInteraction.cardBaseNoRail,
            "grid gap-8 md:gap-10 lg:gap-12",
            article.imageUrl
              ? "md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]"
              : "max-w-4xl",
          )}
        >
          <article>
            <h2
              id={titleId}
              className={cn("max-w-[13ch] text-balance", publicTypography.leadArticleTitle)}
            >
              <StyledTitle
                title={article.title}
                titleStyled={article.titleStyled}
                primaryClassName={variantClasses.titlePrimary}
              />
            </h2>
            {article.excerpt ? (
              <p
                className={cn(
                  "mt-6 max-w-[58ch]",
                  publicTypography.dossierSummary,
                  variantClasses.excerpt,
                )}
              >
                {article.excerpt}
              </p>
            ) : null}
            <div className="mt-7">
              <ArticleMeta article={article} tone={variantClasses.metaTone} />
            </div>
          </article>
          {article.imageUrl ? (
            <div
              className={`relative min-h-76 overflow-hidden border sm:min-h-82 md:min-h-full lg:min-h-120 ${variantClasses.image}`}
            >
              <ArticleCoverImage
                src={article.imageUrl}
                alt={article.imageAlt}
                settings={article.imageSettings}
                fill
                sizes="(min-width: 768px) 48vw, 100vw"
                className={cn(publicInteraction.imageZoom)}
                preload={priority}
              />
            </div>
          ) : null}
        </TrackedPublicLink>
      </div>
    </section>
  );
}
