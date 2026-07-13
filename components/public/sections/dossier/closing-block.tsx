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
  const articleContent = (Heading: "h2" | "h3") => (
    <div className="flex h-full flex-col px-6 pt-6 pb-6 md:px-8 md:pt-7 md:pb-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <span className={cn(publicTypography.articleNumberLg, "text-accent")}>
          {formatArticleNumber(getArticleNumber(articleNumbers, article))}
        </span>
      </div>

      <Heading
        id={titleId}
        className={cn(publicTypography.closingArticleTitle, "w-full text-balance")}
      >
        <StyledTitle
          title={article.title}
          titleStyled={article.titleStyled}
          primaryClassName="text-accent"
        />
      </Heading>

      {article.excerpt ? (
        <p className="mt-5 w-full font-editorial text-[18px] leading-[1.42] text-body-text italic md:text-[21px]">
          {article.excerpt}
        </p>
      ) : null}
      <div className="mt-auto pt-7">
        <ArticleMeta article={article} />
      </div>
    </div>
  );
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
      {articleContent("h3")}
    </Link>
  );

  if (!blockHasCopy) {
    if (article.imageUrl) {
      return (
        <section className="scroll-mt-20 py-10 md:py-12">
          <div className={publicContentClassName}>
            <Link
              href={articleHref}
              aria-labelledby={titleId}
              className={cn(
                publicInteraction.cardSurface,
                "grid overflow-hidden border border-foreground bg-background text-foreground md:grid-cols-[minmax(260px,0.46fr)_minmax(0,0.54fr)]",
              )}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-foreground p-3 md:aspect-auto md:min-h-0 md:border-r md:border-foreground">
                <div className="relative h-full min-h-0 overflow-hidden grayscale">
                  <Image
                    src={article.imageUrl}
                    alt={editorialImageAlt(article.imageAlt)}
                    fill
                    sizes="(min-width: 768px) 40vw, 100vw"
                    className={cn("object-cover", publicInteraction.imageZoom)}
                  />
                </div>
              </div>
              {articleContent("h2")}
            </Link>
          </div>
        </section>
      );
    }

    return (
      <section className="scroll-mt-20 border-t border-foreground py-10 md:py-12">
        <div
          className={`${publicContentClassName} grid gap-6 md:grid-cols-[minmax(0,0.26fr)_minmax(0,0.74fr)] md:gap-10 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] lg:gap-12`}
        >
          <div className="hidden border-t border-foreground md:block" aria-hidden />
          {articleCard}
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
