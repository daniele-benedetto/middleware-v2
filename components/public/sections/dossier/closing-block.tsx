import Image from "next/image";

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
  const image = article.imageUrl ? (
    <div className="relative min-h-48 overflow-hidden border border-foreground grayscale sm:min-h-52 md:min-h-64 lg:min-h-[min(34vh,360px)]">
      <Image
        src={article.imageUrl}
        alt=""
        fill
        sizes="(min-width: 768px) 34vw, 100vw"
        className="object-cover"
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
                <h2 className="max-w-[11ch] font-heading text-[clamp(34px,4.2vw,68px)] leading-[0.9] font-black tracking-[-0.046em] uppercase text-balance">
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

        <article className="min-w-0 border border-foreground bg-background text-foreground">
          {image}
          <div className="px-6 pt-6 pb-6 md:px-8 md:pt-7 md:pb-8">
            <div className="mb-5 flex items-start justify-between gap-4">
              <span className="font-heading text-[40px] leading-[0.78] font-black tracking-[-0.04em] text-accent sm:text-[48px] md:text-[56px]">
                {formatArticleNumber(getArticleNumber(articleNumbers, article))}
              </span>
              {tagLine ? (
                <p className="mt-1.5 max-w-[52vw] text-right font-heading text-[11px] font-bold tracking-[0.14em] break-words text-muted uppercase md:max-w-[24ch]">
                  {tagLine}
                </p>
              ) : null}
            </div>

            <h3 className="w-full font-heading text-[clamp(32px,4.6vw,72px)] leading-[0.92] font-black tracking-[-0.048em] text-balance">
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
        </article>
      </div>
    </section>
  );
}
