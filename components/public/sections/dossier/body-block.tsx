import { DossierArticleCard } from "@/components/public/compounds";
import { publicContentClassName } from "@/components/public/primitives";
import { BlockSectionIntro } from "@/components/public/sections/dossier/block-section-intro";
import {
  articleEyebrow,
  getArticleNumber,
} from "@/components/public/sections/dossier/dossier-format";
import { i18n } from "@/lib/i18n";

import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";
import type { CSSProperties } from "react";

type BodyBlockProps = {
  block: NarrativeHomeBlock;
  articleNumbers: Map<string, number>;
  priority?: boolean;
};

export function BodyBlock({ block, articleNumbers, priority = false }: BodyBlockProps) {
  const featured = block.featuredArticle ?? block.articles[0] ?? null;
  const secondary = featured
    ? block.articles.filter((article) => article.id !== featured.id)
    : block.articles;
  const hasThreeSecondaryArticles = secondary.length === 3;
  const featuredOnRight = block.featuredPlacement === "right";
  const featuredCard = featured ? (
    <DossierArticleCard
      article={featured}
      eyebrow={articleEyebrow(featured)}
      number={getArticleNumber(articleNumbers, featured)}
      variant="clusterFeatured"
    />
  ) : null;
  const secondaryCards = (
    <div
      className={`grid h-full ${hasThreeSecondaryArticles ? "md:grid-rows-[auto_auto_minmax(0,1fr)] lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)]" : "md:auto-rows-fr"}`}
    >
      {secondary.map((article, index) => (
        <DossierArticleCard
          key={article.id}
          article={article}
          eyebrow={articleEyebrow(article)}
          number={getArticleNumber(articleNumbers, article)}
          variant="constellationSecondary"
          className={hasThreeSecondaryArticles && index === 2 ? "lg:col-span-2" : undefined}
        />
      ))}
    </div>
  );
  const gridColumnsClass = featuredOnRight
    ? "md:grid-cols-[minmax(0,0.58fr)_minmax(260px,0.42fr)]"
    : "md:grid-cols-[minmax(260px,0.42fr)_minmax(0,0.58fr)]";

  return (
    <section
      className="scroll-mt-20 py-10 md:py-12"
      data-page-reveal={priority ? "body" : undefined}
      style={priority ? ({ "--page-reveal-delay": "660ms" } as CSSProperties) : undefined}
    >
      <div className={publicContentClassName}>
        {block.title ? null : <h2 className="sr-only">{i18n.public.home.dossier.articlesLabel}</h2>}
        <BlockSectionIntro block={block} />
        <div
          className={`grid items-stretch border-l border-t border-foreground ${gridColumnsClass}`}
        >
          {featuredOnRight ? secondaryCards : featuredCard}
          {featuredOnRight ? featuredCard : secondaryCards}
        </div>
      </div>
    </section>
  );
}
