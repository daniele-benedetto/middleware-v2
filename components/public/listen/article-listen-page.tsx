import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { ArticleListenPlayer } from "@/components/public/listen/article-listen-player";
import { ListenEmptyState } from "@/components/public/listen/listen-empty-state";
import { publicContentClassName } from "@/components/public/primitives";
import { i18n } from "@/lib/i18n";

import type { PublicArticleListenPageData } from "@/lib/public/server/article-listen-page";

type ArticleListenPageProps = {
  data: PublicArticleListenPageData;
};

export function ArticleListenPage({ data }: ArticleListenPageProps) {
  const { article, chunks } = data;
  const text = i18n.public.listenPage;

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
          eyebrow={
            <span className="font-heading text-[11px] font-extrabold tracking-[0.14em] text-accent uppercase">
              {text.title}
            </span>
          }
          meta={
            <PublicMetaRail
              items={[
                { key: "article", label: text.backToArticle, href: `/articoli/${article.slug}` },
              ]}
            />
          }
        />

        <section className="min-h-0 bg-surface py-4 sm:py-5 lg:py-6">
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
