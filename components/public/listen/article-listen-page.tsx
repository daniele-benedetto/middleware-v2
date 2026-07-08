import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { ListenEmptyState } from "@/components/public/listen/listen-empty-state";
import { ListenPlayer } from "@/components/public/listen/listen-player";
import { publicContentClassName } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { i18n } from "@/lib/i18n";
import { formatIssueMonthYearLong } from "@/lib/public/format/issue";

import type { PublicArticleListenPageData } from "@/lib/public/server/article-listen-page";
import type { CSSProperties } from "react";

type ArticleListenPageProps = {
  data: PublicArticleListenPageData;
};

function formatArticleDate(value: string) {
  return formatIssueMonthYearLong(value);
}

function formatArticleNumber(value: number | null) {
  return value ? String(value).padStart(2, "0") : "MW";
}

function getArticleTitleTypographyClassName(title: string) {
  const wordCount = title.trim().split(/\s+/).filter(Boolean).length;

  if (wordCount >= 14) {
    return "font-heading text-[clamp(38px,6vw,88px)] leading-[0.96] font-black tracking-[-0.052em] [text-wrap:balance]";
  }

  if (wordCount >= 9) {
    return "font-heading text-[clamp(42px,7vw,108px)] leading-[0.94] font-black tracking-[-0.056em] [text-wrap:balance]";
  }

  return "font-heading text-[clamp(48px,9.5vw,138px)] leading-[0.86] font-black tracking-[-0.06em] [text-wrap:balance]";
}

export function ArticleListenPage({ data }: ArticleListenPageProps) {
  const { article, articleNumber, chunks } = data;
  const text = i18n.public.listenPage;
  const cardText = i18n.public.home.articleCard;
  const metaItems = [
    { key: "issue", label: article.issueTitle, href: `/uscite/${article.issueSlug}` },
    { key: "category", label: article.categoryName },
    article.authorName ? { key: "author", label: article.authorName } : null,
    { key: "reading-time", label: cardText.readingTimeLabel(article.readingTimeMinutes) },
    { key: "date", label: formatArticleDate(article.publishedAt), dateTime: article.publishedAt },
  ].filter((item) => item !== null);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <article className="grid h-[calc(100svh-var(--public-header-height))] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <PublicPageHero
          as="header"
          title={article.title}
          titleStyled={article.titleStyled}
          titleTypographyClassName={getArticleTitleTypographyClassName(article.title)}
          backgroundCode={formatArticleNumber(articleNumber)}
          meta={
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <PublicMetaRail items={metaItems} />
              <Link
                href={`/articoli/${article.slug}`}
                className="inline-flex w-fit shrink-0 pb-1 font-heading text-xs font-bold tracking-[0.08em] text-accent uppercase transition-colors duration-(--motion-fast) md:hover:text-foreground"
              >
                {text.backToArticle}
              </Link>
            </div>
          }
        />

        <section
          className="min-h-0 overflow-hidden bg-background"
          data-page-reveal="body"
          style={{ "--page-reveal-delay": "620ms" } as CSSProperties}
        >
          <div className={`${publicContentClassName} h-full min-h-0 py-3 sm:py-8 lg:py-10`}>
            <ListenPlayer
              contentKind="article"
              contentId={article.id}
              contentSlug={article.slug}
              contentTitle={article.title}
              contentUpdatedAt={article.updatedAt}
              audioUrl={article.audioUrl ?? ""}
              chunks={chunks}
              emptyState={<ListenEmptyState contentKind="article" />}
            />
          </div>
        </section>
      </article>
    </main>
  );
}
