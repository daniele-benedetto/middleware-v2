import { BlockSectionIntro } from "@/components/public/sections/dossier/block-section-intro";
import { DossierArticleCard } from "@/components/public/sections/dossier/dossier-article-card";
import {
  articleEyebrow,
  getArticleNumber,
} from "@/components/public/sections/dossier/dossier-format";

import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";

type BodyBlockProps = {
  block: NarrativeHomeBlock;
  articleNumbers: Map<string, number>;
};

export function BodyBlock({ block, articleNumbers }: BodyBlockProps) {
  const featured = block.featuredArticle ?? block.articles[0] ?? null;
  const secondary = featured
    ? block.articles.filter((article) => article.id !== featured.id)
    : block.articles;
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
    <div className="grid h-full min-h-full">
      {secondary.map((article) => (
        <DossierArticleCard
          key={article.id}
          article={article}
          eyebrow={articleEyebrow(article)}
          number={getArticleNumber(articleNumbers, article)}
          variant="constellationSecondary"
        />
      ))}
    </div>
  );
  const gridColumnsClass = featuredOnRight
    ? "md:grid-cols-[minmax(0,0.58fr)_minmax(260px,0.42fr)]"
    : "md:grid-cols-[minmax(260px,0.42fr)_minmax(0,0.58fr)]";

  return (
    <section className="scroll-mt-20 px-4 py-10 sm:px-6 md:py-12 lg:px-12">
      <BlockSectionIntro block={block} />
      <div className={`grid items-stretch border-l border-t border-foreground ${gridColumnsClass}`}>
        {featuredOnRight ? secondaryCards : featuredCard}
        {featuredOnRight ? featuredCard : secondaryCards}
      </div>
    </section>
  );
}
