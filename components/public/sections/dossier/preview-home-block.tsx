import { ArticleMeta } from "@/components/public/compounds";
import {
  publicContentClassName,
  publicInteraction,
  publicTypography,
} from "@/components/public/primitives";
import { archiveCoverVariantClasses } from "@/components/public/sections/archive/issue-archive-card";
import { StyledTitle } from "@/components/public/styled-title";
import { TrackedPublicLink } from "@/components/public/tracked-public-link";
import { i18n } from "@/lib/i18n";
import { publicAnalyticsEvents } from "@/lib/public/analytics";
import { isLongPublicTitle } from "@/lib/public/title-scale";
import { cn } from "@/lib/utils";

import type { PreviewHomeBlock as PreviewHomeBlockModel } from "@/components/public/home/home-view-model";
import type { IssueHomeVariant } from "@/lib/server/modules/issues/schema";
import type { CSSProperties } from "react";

// Solid square badge that contrasts with each preview surface (no pills on public pages).
const previewBadgeClasses: Record<IssueHomeVariant, string> = {
  default: "bg-accent text-background",
  red: "bg-foreground text-background",
  black: "bg-accent text-background",
};

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
  const longTitle = isLongPublicTitle(article.title);

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
            <p
              className={cn(
                "mb-6 inline-block px-2.5 py-1.5 font-heading text-[11px] leading-none font-bold tracking-[0.14em] uppercase",
                previewBadgeClasses[homeVariant],
              )}
            >
              {i18n.public.home.dossier.previewLabel}
            </p>
            <h2
              id={titleId}
              className={cn(
                longTitle
                  ? "font-heading text-[clamp(38px,6.3vw,94px)] leading-[0.96] font-black tracking-[-0.052em]"
                  : cn(publicTypography.homeHeroTitle, "leading-[0.94]"),
                "w-full pb-[0.18em]",
                longTitle ? "max-w-[19ch]" : "max-w-[16ch]",
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
