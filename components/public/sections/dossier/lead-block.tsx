import Image from "next/image";

import { ArticleMeta } from "@/components/public/compounds";
import {
  publicContentClassName,
  publicInteraction,
  publicTypography,
} from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import {
  formatArticleNumber,
  formatTags,
  getArticleNumber,
} from "@/components/public/sections/dossier/dossier-format";
import { getNarrativeVariantClasses } from "@/components/public/sections/dossier/dossier-variant";
import { StyledTitle } from "@/components/public/styled-title";
import { editorialImageAlt } from "@/lib/public/format/image";
import { cn } from "@/lib/utils";

import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";
import type { IssueHomeVariant } from "@/lib/server/modules/issues/schema";
import type { CSSProperties } from "react";

type LeadBlockProps = {
  block: NarrativeHomeBlock;
  variant: IssueHomeVariant;
  articleNumbers: Map<string, number>;
  priority?: boolean;
};

export function LeadBlock({ block, variant, articleNumbers, priority = false }: LeadBlockProps) {
  const article = block.featuredArticle ?? block.articles[0];

  if (!article) {
    return null;
  }

  const tagLine = formatTags(article);
  const variantClasses = getNarrativeVariantClasses(variant);
  const articleHref = `/articoli/${article.slug}`;
  const titleId = `lead-article-title-${article.id}`;

  return (
    <section className={`mb-10 scroll-mt-20 lg:mb-12 ${variantClasses.section}`}>
      <div className={`${publicContentClassName} py-10 md:py-12`}>
        <Link
          href={articleHref}
          aria-labelledby={titleId}
          data-page-reveal={priority ? "body" : undefined}
          style={priority ? ({ "--page-reveal-delay": "660ms" } as CSSProperties) : undefined}
          className={cn(
            publicInteraction.cardBase,
            "grid gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] md:gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:gap-12",
          )}
        >
          <div>
            <div className="mb-6 flex items-start justify-between gap-4">
              <span className={cn(publicTypography.articleNumberLg, variantClasses.titlePrimary)}>
                {formatArticleNumber(getArticleNumber(articleNumbers, article))}
              </span>
              {tagLine ? (
                <p className={cn(publicTypography.articleEyebrowWide, variantClasses.eyebrow)}>
                  {tagLine}
                </p>
              ) : null}
            </div>
            <h2
              id={titleId}
              className={cn(publicTypography.leadArticleTitle, "max-w-[13ch] text-balance")}
            >
              <StyledTitle
                title={article.title}
                titleStyled={article.titleStyled}
                primaryClassName={variantClasses.titlePrimary}
              />
            </h2>
            {article.excerpt ? (
              <p
                className={`mt-6 max-w-[58ch] font-editorial text-[clamp(19px,1.6vw,24px)] leading-[1.36] italic ${variantClasses.excerpt}`}
              >
                {article.excerpt}
              </p>
            ) : null}
            {block.description ? (
              <p
                className={`mt-5 max-w-[54ch] font-editorial text-[17px] leading-normal ${variantClasses.description}`}
              >
                {block.description}
              </p>
            ) : null}
            <div className="mt-7">
              <ArticleMeta article={article} tone={variantClasses.metaTone} />
            </div>
          </div>

          {article.imageUrl ? (
            <div
              className={`relative min-h-76 overflow-hidden border sm:min-h-82 md:min-h-full lg:min-h-120 ${variantClasses.image}`}
            >
              <Image
                src={article.imageUrl}
                alt={editorialImageAlt(article.imageAlt)}
                fill
                sizes="(min-width: 768px) 45vw, 100vw"
                className={cn("object-cover", publicInteraction.imageZoom)}
                priority={priority}
              />
            </div>
          ) : null}
        </Link>
      </div>
    </section>
  );
}
