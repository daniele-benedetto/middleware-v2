import { ArticleMeta } from "@/components/public/compounds";
import {
  publicContentClassName,
  publicInteraction,
  publicTypography,
} from "@/components/public/primitives";
import { archiveCoverVariantClasses } from "@/components/public/sections/archive/issue-archive-card";
import { StyledTitle } from "@/components/public/styled-title";
import { TrackedPublicLink } from "@/components/public/tracked-public-link";
import { publicAnalyticsEvents } from "@/lib/public/analytics";
import { cn } from "@/lib/utils";

import type { PreviewHomeBlock as PreviewHomeBlockModel } from "@/components/public/home/home-view-model";
import type { CSSProperties } from "react";

type PreviewHomeBlockProps = {
  block: PreviewHomeBlockModel;
  issueNumber?: string;
  priority?: boolean;
};

export function PreviewHomeBlock({ block, issueNumber, priority = false }: PreviewHomeBlockProps) {
  const { article, homeVariant } = block.previewIssue;
  const titleId = `preview-article-title-${article.id}`;
  const variantClasses = archiveCoverVariantClasses[homeVariant];
  const articleMetaTone =
    homeVariant === "black" ? "dark" : homeVariant === "red" ? "accent" : "light";

  return (
    <section className="my-10 md:my-12">
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
          "relative isolate block overflow-hidden py-10 md:py-12",
          variantClasses.surface,
          variantClasses.border,
          variantClasses.cardBorder,
        )}
      >
        <div className={cn(publicContentClassName, "relative z-10")}>
          {issueNumber ? (
            <span
              className={cn(
                publicTypography.issueBackgroundNumber,
                "pointer-events-none absolute -top-10 right-5 -z-10 select-none",
                variantClasses.backgroundNumber,
              )}
              aria-hidden="true"
            >
              {issueNumber}
            </span>
          ) : null}
          <article>
            <h2
              id={titleId}
              className={cn(
                publicTypography.homeHeroTitle,
                "w-full max-w-[16ch] pb-[0.18em] leading-[0.94]",
                variantClasses.title,
              )}
            >
              <StyledTitle
                title={article.title}
                titleStyled={article.titleStyled}
                primaryClassName={variantClasses.titlePrimary}
              />
            </h2>
            <div className={cn("mt-8 w-full border-t-2 pt-5", variantClasses.border)}>
              {article.excerpt ? (
                <p
                  className={cn(
                    "w-full font-editorial text-[clamp(18px,1.8vw,25px)] leading-[1.36] italic",
                    variantClasses.description,
                  )}
                >
                  {article.excerpt}
                </p>
              ) : null}
              <div className="mt-7">
                <ArticleMeta article={article} tone={articleMetaTone} />
              </div>
            </div>
          </article>
        </div>
      </TrackedPublicLink>
    </section>
  );
}
