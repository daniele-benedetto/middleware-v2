import { ListenCover } from "@/components/public/listen/listen-cover";
import { ListenEmptyState } from "@/components/public/listen/listen-empty-state";
import { ListenInfo } from "@/components/public/listen/listen-info";
import { ListenPlayer } from "@/components/public/listen/listen-player";
import { publicContentClassName } from "@/components/public/primitives";
import { i18n } from "@/lib/i18n";
import { formatIssueMonthYearLong } from "@/lib/public/format/issue";

import type { PublicMetaRailItem } from "@/components/public/compounds";
import type { AudioChunk } from "@/lib/audio/audio-chunks";
import type { PublicArticleListenMetadataData } from "@/lib/public/server/article-listen-page";
import type { PublicArticleDetailDto } from "@/lib/server/modules/articles/dto/public";
import type { CSSProperties } from "react";

type ArticleListenPageProps = {
  data: PublicArticleListenMetadataData;
  chunks: AudioChunk[];
};

function buildKicker(article: PublicArticleDetailDto): PublicMetaRailItem[] {
  return [
    {
      key: "issue",
      label: article.issueTitle,
      href: article.isIssuePublic !== false ? `/uscite/${article.issueSlug}` : undefined,
    },
    { key: "category", label: article.categoryName },
  ];
}

function buildMeta(article: PublicArticleDetailDto): PublicMetaRailItem[] {
  const cardText = i18n.public.home.articleCard;

  return [
    article.authorName ? { key: "author", label: article.authorName } : null,
    { key: "reading-time", label: cardText.readingTimeLabel(article.readingTimeMinutes) },
    {
      key: "date",
      label: formatIssueMonthYearLong(article.publishedAt),
      dateTime: article.publishedAt,
    },
  ].filter((item) => item !== null);
}

export function ArticleListenPage({ data, chunks }: ArticleListenPageProps) {
  const { article } = data;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <article
        className={`${publicContentClassName} h-[calc(100svh-var(--public-issue-chrome-height))] py-4 lg:py-10`}
        data-page-reveal="body"
        style={{ "--page-reveal-delay": "120ms" } as CSSProperties}
      >
        <ListenPlayer
          contentKind="article"
          contentId={article.id}
          contentSlug={article.slug}
          contentTitle={article.title}
          contentUpdatedAt={article.updatedAt}
          audioUrl={article.audioUrl ?? ""}
          chunks={chunks}
          emptyState={<ListenEmptyState contentKind="article" />}
          cover={
            <ListenCover
              imageUrl={article.imageUrl}
              imageAlt={article.imageAlt}
              imageSettings={article.imageSettings}
            />
          }
          info={
            <ListenInfo
              kicker={buildKicker(article)}
              title={article.title}
              titleStyled={article.titleStyled}
              meta={buildMeta(article)}
              backLink={{
                href: `/articoli/${article.slug}`,
                label: i18n.public.listenPage.backToArticle,
              }}
            />
          }
        />
      </article>
    </main>
  );
}
