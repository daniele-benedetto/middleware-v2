import Image from "next/image";
import Link from "next/link";

import { publicInteraction, publicTypography } from "@/components/public/primitives";
import { ArticleMeta } from "@/components/public/sections/dossier/article-meta";
import { BlockTitle } from "@/components/public/sections/dossier/block-title";
import {
  formatArticleNumber,
  formatTags,
  getArticleNumber,
} from "@/components/public/sections/dossier/dossier-format";
import { getNarrativeVariantClasses } from "@/components/public/sections/dossier/dossier-variant";
import { StyledTitle } from "@/components/public/styled-title";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";

type ClosingBlockProps = {
  block: NarrativeHomeBlock;
  articleNumbers: Map<string, number>;
};

export function ClosingBlock({ block, articleNumbers }: ClosingBlockProps) {
  const article = block.featuredArticle ?? block.articles[0];

  if (!article) {
    return null;
  }

  const tagLine = formatTags(article);
  const variantClasses = getNarrativeVariantClasses(block.variant);
  const blockHasCopy = Boolean(block.title || block.description);
  const closingText = i18n.public.home.closing;
  const editorialPanelBorder = block.variant === "default" ? "border border-foreground" : "";
  const articleHref = `/articoli/${article.slug}`;
  const image = article.imageUrl ? (
    <div className="relative min-h-48 overflow-hidden border border-foreground grayscale sm:min-h-52 md:min-h-64 lg:min-h-[min(34vh,360px)]">
      <Image
        src={article.imageUrl}
        alt={article.imageAlt ?? ""}
        fill
        sizes="(min-width: 768px) 34vw, 100vw"
        className={cn("object-cover", publicInteraction.imageZoom)}
      />
    </div>
  ) : null;

  return (
    <section className="px-4 py-10 sm:px-6 md:py-12 lg:px-12">
      <div className="grid gap-8 md:grid-cols-[minmax(220px,0.38fr)_minmax(0,0.62fr)] md:gap-10 lg:grid-cols-[minmax(240px,0.38fr)_minmax(0,0.62fr)] lg:gap-12">
        <aside className={`p-6 md:p-8 lg:p-9 ${variantClasses.section} ${editorialPanelBorder}`}>
          {blockHasCopy ? (
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
          ) : (
            <div className="flex h-full items-end">
              <p
                className={`max-w-[28ch] font-editorial text-[18px] leading-[1.44] italic md:text-[20px] ${variantClasses.description}`}
              >
                {closingText.fallback}
              </p>
            </div>
          )}
        </aside>

        <Link
          href={articleHref}
          aria-label={article.title}
          className={cn(
            publicInteraction.cardSurface,
            "min-w-0 border border-foreground bg-background text-foreground",
          )}
        >
          {image}
          <div className="px-6 pt-6 pb-6 md:px-8 md:pt-7 md:pb-8">
            <div className="mb-5 flex items-start justify-between gap-4">
              <span className={cn(publicTypography.articleNumberLg, "text-accent")}>
                {formatArticleNumber(getArticleNumber(articleNumbers, article))}
              </span>
              {tagLine ? (
                <p className={cn(publicTypography.articleEyebrowWide, "text-muted")}>{tagLine}</p>
              ) : null}
            </div>

            <h3 className={cn(publicTypography.closingArticleTitle, "w-full text-balance")}>
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
            <div className="pt-7">
              <ArticleMeta article={article} />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
