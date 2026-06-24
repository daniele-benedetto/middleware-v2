import { DossierArticleCard } from "@/components/public/compounds";
import { publicContentClassName } from "@/components/public/primitives";
import { formatTags } from "@/components/public/sections/dossier/dossier-format";
import { sortUnpaginatedArticles } from "@/components/public/sections/dossier/dossier-view-model";

import type { HomeIssueArticle } from "@/components/public/home/home-view-model";

type UnpaginatedArticleRowProps = {
  articles: HomeIssueArticle[];
  id?: string;
  startNumber?: number;
};

export function UnpaginatedArticleRow({
  articles,
  id,
  startNumber = 1,
}: UnpaginatedArticleRowProps) {
  const orderedArticles = sortUnpaginatedArticles(articles);

  if (orderedArticles.length === 0) {
    return null;
  }

  return (
    <section id={id} className="scroll-mt-20 py-10 lg:py-12">
      <div className={publicContentClassName}>
        <div className="grid border-l border-t border-foreground md:grid-cols-2 xl:grid-cols-3">
          {orderedArticles.map((article, index) => (
            <DossierArticleCard
              key={article.id}
              article={article}
              eyebrow={formatTags(article) || article.categoryName || ""}
              number={startNumber + index}
              variant="constellationSecondary"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
