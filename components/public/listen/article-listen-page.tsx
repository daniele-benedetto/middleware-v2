import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { ArticleListenPlayer } from "@/components/public/listen/article-listen-player";
import { ListenEmptyState } from "@/components/public/listen/listen-empty-state";
import { ListenPlayerHeader } from "@/components/public/listen/listen-player-header";
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
      <article>
        <PublicPageHero
          as="header"
          title={article.title}
          titleStyled={article.titleStyled}
          backgroundCode="AU"
          description={article.excerpt}
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

        <section className="bg-surface py-12 sm:py-16 lg:py-20">
          <div className={publicContentClassName}>
            <ArticleListenPlayer
              articleId={article.id}
              articleSlug={article.slug}
              articleTitle={article.title}
              articleUpdatedAt={article.updatedAt}
              audioUrl={article.audioUrl ?? ""}
              chunks={chunks}
              header={<ListenPlayerHeader />}
              emptyState={<ListenEmptyState />}
            />
          </div>
        </section>
      </article>
    </main>
  );
}
