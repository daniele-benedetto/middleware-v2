import { PublicSystemScreen } from "@/components/public";
import { publicContentClassName } from "@/components/public/primitives";
import { ArticleArchiveCard } from "@/components/public/sections/archive/article-archive-card";
import { IssuesArchiveHero } from "@/components/public/sections/archive/issues-archive-hero";
import { i18n } from "@/lib/i18n";
import { buildArticlesArchiveJsonLd } from "@/lib/seo";

import type { PublicArticleSummaryDto } from "@/lib/server/modules/articles/dto/public";
import type { CSSProperties } from "react";

type PublicArticlesArchivePageProps = {
  articles: PublicArticleSummaryDto[];
};

export function PublicArticlesArchivePage({ articles }: PublicArticlesArchivePageProps) {
  const text = i18n.public.articlesArchive;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildArticlesArchiveJsonLd(articles, text.metadata.title, text.metadata.description),
          ),
        }}
      />
      {articles.length > 0 ? (
        <>
          <IssuesArchiveHero
            title={text.hero.title}
            description={text.hero.description}
            totalLabel={text.hero.totalLabel(articles.length)}
          />
          <div
            className={publicContentClassName}
            data-page-reveal="body"
            style={{ "--page-reveal-delay": "660ms" } as CSSProperties}
          >
            <h2 className="sr-only">{text.metadata.title}</h2>
            <div className="grid border-foreground md:grid-cols-2 md:border-t md:border-l xl:grid-cols-3">
              {articles.map((article, index) => (
                <ArticleArchiveCard
                  key={article.id}
                  article={article}
                  number={articles.length - index}
                  position={index + 1}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <PublicSystemScreen
          code={text.empty.code}
          kicker={text.empty.kicker}
          title={text.empty.title}
          description={text.empty.description}
        />
      )}
    </main>
  );
}
