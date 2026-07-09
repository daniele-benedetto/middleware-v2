import { PlayIcon } from "lucide-react";
import Image from "next/image";

import { DossierArticleCard, PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { HomeSectionHeader } from "@/components/public/home/home-section-header";
import { publicContentClassName } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { PublicRichText } from "@/components/public/rich-text";
import { i18n } from "@/lib/i18n";
import { editorialImageAlt } from "@/lib/public/format/image";
import { formatIssueMonthYearLong } from "@/lib/public/format/issue";
import { buildArticlePageJsonLd } from "@/lib/seo";

import type { PublicRelatedIssueArticle } from "@/lib/public/server/article-page";
import type { PublicArticleDetailDto } from "@/lib/server/modules/articles/dto/public";
import type { CSSProperties } from "react";

type PublicArticlePageProps = {
  article: PublicArticleDetailDto;
  articleNumber: number | null;
  relatedArticles: PublicRelatedIssueArticle[];
};

type ArticleOnlyProps = {
  article: PublicArticleDetailDto;
};

type RelatedArticlesSectionProps = {
  article: PublicArticleDetailDto;
  relatedArticles: PublicRelatedIssueArticle[];
};

function formatArticleNumber(value: number | null) {
  return value ? String(value).padStart(2, "0") : "MW";
}

function getRelatedArticlesGridClassName(count: number) {
  if (count === 1) {
    return "grid md:border-l md:border-t md:border-foreground";
  }

  if (count === 2) {
    return "grid md:grid-cols-2 md:border-l md:border-t md:border-foreground";
  }

  return "grid md:grid-cols-2 md:border-l md:border-t md:border-foreground xl:grid-cols-3";
}

function getRelatedArticleCardClassName(index: number, count: number) {
  if (count === 3 && index === 2) {
    return "md:col-span-2 xl:col-span-1";
  }

  return undefined;
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

function ArticleMetaRail({ article }: ArticleOnlyProps) {
  const text = i18n.public.articlePage;
  const cardText = i18n.public.home.articleCard;
  const metaItems = [
    { key: "issue", label: article.issueTitle, href: `/uscite/${article.issueSlug}` },
    { key: "category", label: article.categoryName },
    article.authorName ? { key: "author", label: article.authorName } : null,
    { key: "reading-time", label: cardText.readingTimeLabel(article.readingTimeMinutes) },
    {
      key: "date",
      label: formatIssueMonthYearLong(article.publishedAt),
      dateTime: article.publishedAt,
    },
  ].filter((item) => item !== null);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <PublicMetaRail items={metaItems} />

      {article.audioUrl ? (
        <Link
          href={`/articoli/${article.slug}/ascolta`}
          className="inline-flex w-fit shrink-0 items-center gap-2 pb-1 font-heading text-xs font-bold tracking-[0.08em] text-accent uppercase transition-colors duration-(--motion-fast) md:hover:text-foreground"
        >
          <PlayIcon className="size-3.5 fill-current" aria-hidden />
          {text.audioCta}
        </Link>
      ) : null}
    </div>
  );
}

function RelatedArticlesSection({ article, relatedArticles }: RelatedArticlesSectionProps) {
  if (relatedArticles.length === 0) return null;

  const text = i18n.public.articlePage;

  return (
    <section className="scroll-mt-20 bg-background py-12 lg:py-14">
      <div className={publicContentClassName}>
        <HomeSectionHeader
          title="Articoli correlati"
          action={{ label: text.viewIssue, href: `/uscite/${article.issueSlug}` }}
        />

        <div className={getRelatedArticlesGridClassName(relatedArticles.length)}>
          {relatedArticles.map((item, index) => (
            <DossierArticleCard
              key={item.article.id}
              article={item.article}
              number={item.number}
              variant="constellationSecondary"
              className={getRelatedArticleCardClassName(index, relatedArticles.length)}
              showImage={false}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicArticlePage({
  article,
  articleNumber,
  relatedArticles,
}: PublicArticlePageProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildArticlePageJsonLd(article, article.excerpt)),
        }}
      />
      <article>
        <PublicPageHero
          as="header"
          title={article.title}
          titleStyled={article.titleStyled}
          titleTypographyClassName={getArticleTitleTypographyClassName(article.title)}
          backgroundCode={formatArticleNumber(articleNumber)}
          description={article.excerpt}
          meta={<ArticleMetaRail article={article} />}
        />

        {article.imageUrl ? (
          <figure
            className="bg-foreground"
            data-page-reveal="media"
            style={{ "--page-reveal-delay": "620ms" } as CSSProperties}
          >
            <Image
              src={article.imageUrl}
              alt={editorialImageAlt(article.imageAlt)}
              width={1600}
              height={900}
              sizes="100vw"
              preload
              className="mx-auto aspect-video w-full max-w-400 object-cover"
            />
          </figure>
        ) : null}

        <div
          className="bg-surface py-12 sm:py-16 lg:py-20"
          data-page-reveal="body"
          style={{ "--page-reveal-delay": article.imageUrl ? "760ms" : "620ms" } as CSSProperties}
        >
          <div className={publicContentClassName}>
            <div className="mx-auto max-w-3xl space-y-10">
              <PublicRichText value={article.contentRich} />
            </div>
          </div>
        </div>

        <RelatedArticlesSection article={article} relatedArticles={relatedArticles} />
      </article>
    </main>
  );
}
