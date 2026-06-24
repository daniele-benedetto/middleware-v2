import { ArticleListenPlayer } from "@/components/public/listen/article-listen-player";
import { publicContentClassName } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";

import type { PublicArticleListenPageData } from "@/lib/public/server/article-listen-page";

type ArticleListenPageProps = {
  data: PublicArticleListenPageData;
};

export function ArticleListenPage({ data }: ArticleListenPageProps) {
  const { article, chunks } = data;

  return (
    <main className="flex flex-1 flex-col bg-surface py-4 font-heading text-foreground sm:py-5 lg:py-6">
      <div className={`${publicContentClassName} flex flex-1 flex-col gap-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-foreground pb-3">
          <div className="font-heading text-[11px] font-extrabold tracking-[0.14em] text-muted uppercase">
            <Link
              href={`/articoli/${article.slug}`}
              className="transition-colors hover:text-accent"
            >
              Torna all&apos;articolo
            </Link>
          </div>
          <div className="font-heading text-[11px] font-extrabold tracking-[0.14em] text-accent uppercase">
            Ascolta l&apos;articolo
          </div>
        </div>

        <ArticleListenPlayer
          articleId={article.id}
          articleSlug={article.slug}
          articleTitle={article.title}
          articleUpdatedAt={article.updatedAt}
          audioUrl={article.audioUrl ?? ""}
          chunks={chunks}
          excerpt={article.excerpt}
        />
      </div>
    </main>
  );
}
