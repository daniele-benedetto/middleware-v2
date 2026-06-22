import Image from "next/image";
import Link from "next/link";

import { AutoClampText } from "@/components/public/home/auto-clamp-text";
import { publicTypography } from "@/components/public/primitives";
import { ArticleMeta } from "@/components/public/sections/dossier/article-meta";
import { formatArticleNumber } from "@/components/public/sections/dossier/dossier-format";
import { StyledTitle } from "@/components/public/styled-title";
import { cn } from "@/lib/utils";

import type { HomeIssueArticle } from "@/components/public/home/home-view-model";

type DossierArticleCardProps = {
  article: HomeIssueArticle;
  eyebrow: string;
  number: number;
  variant?:
    | "standard"
    | "featured"
    | "clusterFeatured"
    | "constellationSecondary"
    | "compact"
    | "closing";
  className?: string;
};

export function DossierArticleCard({
  article,
  eyebrow,
  number,
  variant = "standard",
  className = "",
}: DossierArticleCardProps) {
  const articleHref = `/articoli/${article.slug}`;
  const hasImage = Boolean(article.imageUrl);
  const isCompact = variant === "compact";
  const isClosing = variant === "closing";
  const isClusterFeatured = variant === "clusterFeatured";
  const isConstellationSecondary = variant === "constellationSecondary";
  const showImageAfterTitle = isClusterFeatured || isConstellationSecondary;
  const summary = isClusterFeatured ? (article.contentPreview ?? article.excerpt) : article.excerpt;
  const showImage = Boolean(article.imageUrl) && !isCompact;
  const image = showImage ? (
    <div
      className={`relative overflow-hidden border border-foreground grayscale ${
        isClusterFeatured
          ? "mt-5 h-40 sm:h-44 md:h-52 lg:h-[min(30vh,250px)]"
          : isClosing
            ? "mt-6 h-52 sm:h-58 md:mt-0 md:h-full md:min-h-86 lg:min-h-100"
            : isConstellationSecondary
              ? "mt-5 h-32 sm:h-34 md:h-38"
              : "mt-5 h-40 sm:h-44 md:h-52"
      }`}
    >
      <Image
        src={article.imageUrl!}
        alt={article.imageAlt ?? ""}
        fill
        sizes="(min-width: 768px) 38vw, 100vw"
        className="object-cover transition-transform duration-(--motion-slow) ease-(--easing-standard) group-hover:scale-[1.035] group-focus-visible:scale-[1.035]"
      />
    </div>
  ) : null;

  return (
    <Link
      href={articleHref}
      aria-label={article.title}
      className={`group flex h-full min-h-full cursor-pointer overflow-hidden border-foreground bg-background transition-[background,box-shadow] duration-(--motion-fast) focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-accent hover:bg-surface-hover hover:shadow-(--interactive-rail-shadow) ${
        isClosing
          ? "border px-5 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8"
          : "border-r border-b px-5 py-5 sm:px-6 sm:py-6 md:px-7 md:py-7"
      } ${
        isClosing
          ? "flex-col md:grid md:grid-cols-[minmax(0,0.62fr)_minmax(240px,0.38fr)] md:items-stretch md:gap-8"
          : "flex-col"
      } ${className}`}
    >
      <article className="contents">
        <div
          className={
            isClosing
              ? "flex h-full min-h-full min-w-0 flex-col"
              : "flex h-full min-h-0 min-w-0 flex-col"
          }
        >
          <div className="mb-5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
            <span
              className={`shrink-0 font-heading leading-[0.78] font-black tracking-[-0.04em] text-accent ${
                isClusterFeatured
                  ? "text-[40px] sm:text-[48px] md:text-[56px]"
                  : isClosing
                    ? "text-[28px] sm:text-[30px] md:text-[36px]"
                    : "text-[40px] sm:text-[48px]"
              }`}
            >
              {formatArticleNumber(number)}
            </span>
            <span className={cn(publicTypography.articleEyebrow, "min-w-0 text-muted")}>
              {eyebrow}
            </span>
          </div>

          <h3
            className={`font-heading leading-[1.05] font-black tracking-[-0.032em] text-foreground ${
              isClusterFeatured
                ? "text-[25px] sm:text-[27px] md:text-[32px]"
                : isClosing
                  ? "max-w-[16ch] text-[28px] sm:text-[30px] md:text-[40px] lg:text-[46px]"
                  : isConstellationSecondary
                    ? "text-[23px] sm:text-[24px] md:text-[28px]"
                    : hasImage && !isCompact
                      ? "text-[24px] sm:text-[25px] md:text-[30px]"
                      : "text-[27px] sm:text-[29px] md:text-[36px]"
            }`}
          >
            <StyledTitle title={article.title} titleStyled={article.titleStyled} />
          </h3>
          {showImageAfterTitle ? image : null}
          {summary ? (
            isClusterFeatured ? (
              <AutoClampText className="mt-4 flex-1 font-editorial text-[17px] leading-normal text-body-text md:text-[18px]">
                {summary}
              </AutoClampText>
            ) : (
              <p
                className={`mt-4 min-h-0 overflow-hidden font-editorial leading-normal text-body-text ${
                  isClosing
                    ? "max-w-[54ch] text-[18px] leading-[1.45] md:text-[20px]"
                    : isConstellationSecondary
                      ? "line-clamp-4 flex-1 text-[16px] md:text-[17px]"
                      : "flex-1 text-[16px] md:text-[17px]"
                }`}
              >
                {summary}
              </p>
            )
          ) : null}
          <div className={`mt-auto ${isClosing ? "pt-8" : "pt-6"}`}>
            <ArticleMeta article={article} />
          </div>
        </div>

        {showImageAfterTitle ? null : image}
      </article>
    </Link>
  );
}
