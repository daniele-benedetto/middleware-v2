import Image from "next/image";

import { ArticleMeta } from "@/components/public/compounds/article-meta";
import { publicInteraction, publicTypography } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { formatArticleNumber } from "@/components/public/sections/dossier/dossier-format";
import { StyledTitle } from "@/components/public/styled-title";
import { editorialImageAlt } from "@/lib/public/format/image";
import { cn } from "@/lib/utils";

import type { HomeIssueArticle } from "@/components/public/home/home-view-model";

type DossierArticleCardProps = {
  article: HomeIssueArticle;
  eyebrow: string;
  number: number;
  variant: "clusterFeatured" | "constellationSecondary";
  className?: string;
  showImage?: boolean;
};

export function DossierArticleCard({
  article,
  eyebrow,
  number,
  variant,
  className = "",
  showImage = true,
}: DossierArticleCardProps) {
  const articleHref = `/articoli/${article.slug}`;
  const titleId = `article-card-title-${article.id}`;
  const isClusterFeatured = variant === "clusterFeatured";
  const summary = article.excerpt;
  const image =
    showImage && article.imageUrl ? (
      <div className="mt-5 overflow-hidden border border-foreground grayscale">
        <Image
          src={article.imageUrl}
          alt={editorialImageAlt(article.imageAlt)}
          width={1200}
          height={800}
          sizes="(min-width: 768px) 38vw, 100vw"
          className={cn("h-auto w-full object-cover", publicInteraction.imageZoom)}
        />
      </div>
    ) : null;

  return (
    <Link
      href={articleHref}
      aria-labelledby={titleId}
      className={cn(
        publicInteraction.cardSurface,
        "flex h-full overflow-hidden border-foreground bg-background",
        "flex-col border-r border-b px-5 py-5 sm:px-6 sm:py-6 md:px-7 md:py-7",
        className,
      )}
    >
      <article className="contents">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
            <span
              className={`shrink-0 font-heading leading-[0.78] font-black tracking-[-0.04em] text-accent ${
                isClusterFeatured
                  ? "text-[40px] sm:text-[48px] md:text-[56px]"
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
            id={titleId}
            className={`font-heading leading-[1.05] font-black tracking-[-0.032em] text-foreground ${
              isClusterFeatured
                ? "text-[25px] sm:text-[27px] md:text-[32px]"
                : "text-[23px] sm:text-[24px] md:text-[28px]"
            }`}
          >
            <StyledTitle title={article.title} titleStyled={article.titleStyled} />
          </h3>
          {image}
          {summary ? (
            <p
              className={`mt-4 font-editorial leading-normal text-body-text ${
                isClusterFeatured ? "text-[17px] md:text-[18px]" : "text-[16px] md:text-[17px]"
              }`}
            >
              {summary}
            </p>
          ) : null}
          <div className="mt-auto pt-6">
            <ArticleMeta article={article} />
          </div>
        </div>
      </article>
    </Link>
  );
}
