import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { ArticleListenPlayer } from "@/components/public/listen/article-listen-player";
import { ListenEmptyState } from "@/components/public/listen/listen-empty-state";
import { publicContentClassName } from "@/components/public/primitives";
import { i18n } from "@/lib/i18n";

import type { PublicArticleListenPageData } from "@/lib/public/server/article-listen-page";
import type { CSSProperties } from "react";

type ArticleListenPageProps = {
  data: PublicArticleListenPageData;
};

function formatArticleDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(new Date(value));
}

export function ArticleListenPage({ data }: ArticleListenPageProps) {
  const { article, chunks } = data;
  const text = i18n.public.listenPage;
  const metaItems = [
    { key: "issue", label: article.issueTitle, href: `/uscite/${article.issueSlug}` },
    { key: "category", label: article.categoryName },
    article.authorName ? { key: "author", label: article.authorName } : null,
    { key: "date", label: formatArticleDate(article.publishedAt), dateTime: article.publishedAt },
    { key: "article", label: text.backToArticle, href: `/articoli/${article.slug}` },
  ].filter((item) => item !== null);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <article className="grid min-h-[calc(100svh-112px)] grid-rows-[auto_minmax(0,1fr)]">
        <PublicPageHero
          as="header"
          title={article.title}
          titleStyled={article.titleStyled}
          backgroundCode="AU"
          containerClassName="pt-7 pb-5 sm:pt-9 sm:pb-6 lg:pt-10 lg:pb-7"
          meta={<PublicMetaRail items={metaItems} />}
        />

        <section
          className="min-h-0 bg-surface py-4 sm:py-5 lg:py-6"
          data-page-reveal="body"
          style={{ "--page-reveal-delay": "620ms" } as CSSProperties}
        >
          <div className={`${publicContentClassName} h-full min-h-0`}>
            <ArticleListenPlayer
              articleId={article.id}
              articleSlug={article.slug}
              articleTitle={article.title}
              articleUpdatedAt={article.updatedAt}
              audioUrl={article.audioUrl ?? ""}
              chunks={chunks}
              emptyState={<ListenEmptyState />}
            />
          </div>
        </section>
      </article>
    </main>
  );
}
