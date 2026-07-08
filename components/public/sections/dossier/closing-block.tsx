import Image from "next/image";

import { ArticleMeta } from "@/components/public/compounds";
import {
  publicContentClassName,
  publicInteraction,
  publicTypography,
} from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { BlockTitle } from "@/components/public/sections/dossier/block-title";
import {
  formatArticleNumber,
  getArticleNumber,
} from "@/components/public/sections/dossier/dossier-format";
import { getNarrativeVariantClasses } from "@/components/public/sections/dossier/dossier-variant";
import { StyledTitle } from "@/components/public/styled-title";
import { editorialImageAlt } from "@/lib/public/format/image";
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
  const blockHasCopy = Boolean(block.title || block.description);
  const editorialPanelBorder = variant === "default" ? "border border-foreground" : "";
  const articleHref = `/articoli/${article.slug}`;
  const titleId = `closing-article-title-${article.id}`;
  const showBorder = variant === "default";
  const hasImage = Boolean(article.imageUrl);
  const imageOnRight = block.featuredPlacement === "right";
  const featureImageBorderClass = imageOnRight
    ? "border-t md:border-t-0 md:border-l"
    : "border-b md:border-r md:border-b-0";
  const featureCardBorderClass = showBorder ? "border-l border-foreground" : "";
  const image = article.imageUrl ? (
    <div className="relative min-h-48 overflow-hidden border border-foreground grayscale sm:min-h-52 md:min-h-64 lg:min-h-[min(34vh,360px)]">
      <Image
        src={article.imageUrl}
        alt={editorialImageAlt(article.imageAlt)}
        fill
        sizes="(min-width: 768px) 34vw, 100vw"
        className={cn("object-cover", publicInteraction.imageZoom)}
      />
    </div>
  ) : null;
  const articleCard = (
    <Link
      href={articleHref}
      aria-labelledby={titleId}
      className={cn(
        publicInteraction.cardSurface,
        "min-w-0 border border-foreground bg-background text-foreground",
      )}
    >
      {image}
      <div className="flex h-full flex-col px-6 pt-6 pb-6 md:px-8 md:pt-7 md:pb-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <span className={cn(publicTypography.articleNumberLg, "text-accent")}>
            {formatArticleNumber(getArticleNumber(articleNumbers, article))}
          </span>
        </div>

        <h3
          id={titleId}
          className={cn(publicTypography.closingArticleTitle, "w-full text-balance")}
        >
          <StyledTitle
            title={article.title}
            titleStyled={article.titleStyled}
            primaryClassName="text-accent"
          />
        </h3>

        {article.excerpt ? (
          <p className="mt-5 w-full font-editorial text-[18px] leading-[1.42] text-body-text italic md:text-[21px]">
            {article.excerpt}
          </p>
        ) : null}
        <div className="mt-auto pt-7">
          <ArticleMeta article={article} />
        </div>
      </div>
    </Link>
  );

  if (!blockHasCopy) {
    const featureImage = article.imageUrl ? (
      <div
        className={`relative min-h-70 overflow-hidden sm:min-h-76 md:min-h-full ${showBorder ? `${featureImageBorderClass} ${variantClasses.image}` : "grayscale"}`}
      >
        <Image
          src={article.imageUrl}
          alt={editorialImageAlt(article.imageAlt)}
          fill
          sizes="(min-width: 768px) 42vw, 100vw"
          className={cn("object-cover", publicInteraction.imageZoom)}
        />
      </div>
    ) : null;

    return (
      <section className="scroll-mt-20 py-10 md:py-12">
        <div className={publicContentClassName}>
          <Link
            href={articleHref}
            aria-labelledby={titleId}
            className={cn(
              publicInteraction.cardBase,
              hasImage ? "grid md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]" : "block",
              variantClasses.section,
              featureCardBorderClass,
            )}
          >
            {imageOnRight ? null : featureImage}
            <article className="px-5 py-5 sm:px-6 sm:py-6 md:p-8 lg:p-9">
              <div className="mb-6 flex items-start justify-between gap-4">
                <span className={cn(publicTypography.articleNumberLg, variantClasses.titlePrimary)}>
                  {formatArticleNumber(getArticleNumber(articleNumbers, article))}
                </span>
              </div>
              <h2
                id={titleId}
                className={cn(
                  publicTypography.featureArticleTitle,
                  hasImage ? "max-w-[14ch] text-balance" : "text-balance",
                )}
              >
                <StyledTitle
                  title={article.title}
                  titleStyled={article.titleStyled}
                  primaryClassName={variantClasses.titlePrimary}
                />
              </h2>
              {article.excerpt ? (
                <p
                  className={`mt-6 font-editorial text-[19px] leading-[1.38] md:text-[22px] ${hasImage ? "max-w-[54ch]" : ""} ${variantClasses.excerpt}`}
                >
                  {article.excerpt}
                </p>
              ) : null}
              <div className="mt-7">
                <ArticleMeta article={article} tone={variantClasses.metaTone} />
              </div>
            </article>
            {imageOnRight ? featureImage : null}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-12">
      <div
        className={`${publicContentClassName} grid gap-8 md:grid-cols-[minmax(220px,0.38fr)_minmax(0,0.62fr)] md:gap-10 lg:grid-cols-[minmax(240px,0.38fr)_minmax(0,0.62fr)] lg:gap-12`}
      >
        <aside className={`p-6 md:p-8 lg:p-9 ${variantClasses.section} ${editorialPanelBorder}`}>
          <div>
            {block.title ? (
              <h2 className={cn(publicTypography.closingPanelTitle, "max-w-[11ch] text-balance")}>
                <BlockTitle block={block} primaryClassName={variantClasses.titlePrimary} />
              </h2>
            ) : null}
            {block.description ? (
              <p
                className={`mt-5 max-w-[36ch] font-editorial text-[18px] leading-[1.44] md:text-[20px] ${variantClasses.description}`}
              >
                {block.description}
              </p>
            ) : null}
          </div>
        </aside>

        {articleCard}
      </div>
    </section>
  );
}
