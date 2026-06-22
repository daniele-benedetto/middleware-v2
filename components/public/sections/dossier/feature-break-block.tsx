import Image from "next/image";

import { ArticleMeta } from "@/components/public/sections/dossier/article-meta";
import {
  blockEyebrow,
  formatArticleNumber,
  getArticleNumber,
} from "@/components/public/sections/dossier/dossier-format";
import { getNarrativeVariantClasses } from "@/components/public/sections/dossier/dossier-variant";
import { StyledTitle } from "@/components/public/styled-title";

import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";

type FeatureBreakBlockProps = {
  block: NarrativeHomeBlock;
  articleNumbers: Map<string, number>;
};

export function FeatureBreakBlock({ block, articleNumbers }: FeatureBreakBlockProps) {
  const article = block.featuredArticle ?? block.articles[0];

  if (!article) {
    return null;
  }

  const variantClasses = getNarrativeVariantClasses(block.variant);
  const eyebrow = blockEyebrow(block, article);
  const showBorder = block.variant === "default";
  const imageOnRight = block.featuredPlacement === "right";
  const imageBorderClass = imageOnRight
    ? "border-t md:border-t-0 md:border-l"
    : "border-b md:border-r md:border-b-0";
  const image = article.imageUrl ? (
    <div
      className={`relative min-h-70 sm:min-h-76 md:min-h-full ${showBorder ? `${imageBorderClass} ${variantClasses.image}` : "grayscale"}`}
    >
      <Image
        src={article.imageUrl}
        alt=""
        fill
        sizes="(min-width: 768px) 42vw, 100vw"
        className="object-cover"
      />
    </div>
  ) : null;

  return (
    <section className="scroll-mt-20 px-4 py-10 sm:px-6 md:py-12 lg:px-12">
      <div
        className={`grid md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] ${variantClasses.section} ${showBorder ? "border border-current" : ""}`}
      >
        {imageOnRight ? null : image}
        <article className="px-5 py-5 sm:px-6 sm:py-6 md:p-8 lg:p-9">
          <div className="mb-6 flex items-start justify-between gap-4">
            <span
              className={`font-heading text-[40px] leading-[0.78] font-black tracking-[-0.04em] sm:text-[48px] md:text-[56px] ${variantClasses.titlePrimary}`}
            >
              {formatArticleNumber(getArticleNumber(articleNumbers, article))}
            </span>
            {eyebrow ? (
              <span
                className={`mt-1.5 max-w-[52vw] text-right font-heading text-[11px] font-bold tracking-[0.12em] break-words uppercase md:max-w-[24ch] ${variantClasses.eyebrow}`}
              >
                {eyebrow}
              </span>
            ) : null}
          </div>
          <h2 className="max-w-[14ch] font-heading text-[clamp(38px,5vw,76px)] leading-[0.9] font-black tracking-tighter text-balance">
            <StyledTitle
              title={article.title}
              titleStyled={article.titleStyled}
              primaryClassName={variantClasses.titlePrimary}
            />
          </h2>
          {article.excerpt ? (
            <p
              className={`mt-6 max-w-[54ch] font-editorial text-[19px] leading-[1.38] md:text-[22px] ${variantClasses.excerpt}`}
            >
              {article.excerpt}
            </p>
          ) : null}
          {block.description ? (
            <p
              className={`mt-5 max-w-[48ch] font-editorial text-[17px] leading-normal ${variantClasses.description}`}
            >
              {block.description}
            </p>
          ) : null}
          <div className="mt-7">
            <ArticleMeta article={article} tone={variantClasses.metaTone} />
          </div>
        </article>
        {imageOnRight ? image : null}
      </div>
    </section>
  );
}
