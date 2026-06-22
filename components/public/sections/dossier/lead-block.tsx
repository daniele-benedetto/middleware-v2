import Image from "next/image";
import Link from "next/link";

import { publicTypography } from "@/components/public/primitives";
import { ArticleMeta } from "@/components/public/sections/dossier/article-meta";
import {
  formatArticleNumber,
  formatTags,
  getArticleNumber,
} from "@/components/public/sections/dossier/dossier-format";
import { getNarrativeVariantClasses } from "@/components/public/sections/dossier/dossier-variant";
import { StyledTitle } from "@/components/public/styled-title";
import { cn } from "@/lib/utils";

import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";

type LeadBlockProps = {
  block: NarrativeHomeBlock;
  articleNumbers: Map<string, number>;
};

export function LeadBlock({ block, articleNumbers }: LeadBlockProps) {
  const article = block.featuredArticle ?? block.articles[0];

  if (!article) {
    return null;
  }

  const tagLine = formatTags(article);
  const variantClasses = getNarrativeVariantClasses(block.variant);
  const articleHref = `/articoli/${article.slug}`;

  return (
    <section id="dossier" className={`mb-10 scroll-mt-20 lg:mb-12 ${variantClasses.section}`}>
      <div className="px-4 py-10 sm:px-6 md:py-12 lg:px-12">
        <Link
          href={articleHref}
          aria-label={article.title}
          className="group grid cursor-pointer gap-8 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-accent md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] md:gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:gap-12"
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
            <h2 className="max-w-[13ch] font-heading text-[clamp(42px,6.6vw,104px)] leading-[0.88] font-black tracking-[-0.052em] text-balance">
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
                alt={article.imageAlt ?? ""}
                fill
                sizes="(min-width: 768px) 45vw, 100vw"
                className="object-cover transition-transform duration-(--motion-slow) ease-(--easing-standard) group-hover:scale-[1.035] group-focus-visible:scale-[1.035]"
                priority
              />
            </div>
          ) : null}
        </Link>
      </div>
    </section>
  );
}
