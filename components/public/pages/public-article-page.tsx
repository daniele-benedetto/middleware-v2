import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { PublicRichText } from "@/components/public/rich-text";
import { DossierArticleCard } from "@/components/public/sections/dossier/dossier-article-card";
import { formatTags } from "@/components/public/sections/dossier/dossier-format";
import { StyledTitle } from "@/components/public/styled-title";

import type { PublicRelatedIssueArticle } from "@/lib/public/server/article-page";
import type { PublicArticleDetailDto } from "@/lib/server/modules/articles/dto/public";

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

function formatArticleDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(new Date(value));
}

function formatArticleNumber(value: number | null) {
  return value ? String(value).padStart(2, "0") : "MW";
}

function ArticleMetaRail({ article }: ArticleOnlyProps) {
  const metaItems = [
    { key: "issue", label: article.issueTitle, href: `/uscite/${article.issueSlug}` },
    { key: "category", label: article.categoryName },
    article.authorName ? { key: "author", label: article.authorName } : null,
    { key: "date", label: formatArticleDate(article.publishedAt), dateTime: article.publishedAt },
  ].filter((item) => item !== null);

  return (
    <div className="flex flex-wrap items-center gap-3 font-heading text-[13px] font-semibold text-muted sm:text-[14px]">
      {metaItems.map((item, index) => (
        <span key={item.key} className="flex items-center gap-3">
          {index > 0 ? <span className="size-1 rounded-[1px] bg-accent" aria-hidden /> : null}
          {item.dateTime ? (
            <time dateTime={item.dateTime}>{item.label}</time>
          ) : item.href ? (
            <Link href={item.href} className="hover:text-accent">
              {item.label}
            </Link>
          ) : (
            item.label
          )}
        </span>
      ))}
    </div>
  );
}

function ArticleAudio({ article }: ArticleOnlyProps) {
  if (!article.audioUrl) return null;

  return (
    <section className="border-y-2 border-foreground bg-background py-5">
      <div className="mb-3 font-heading text-[12px] font-extrabold tracking-[0.12em] uppercase">
        Ascolta articolo
      </div>
      <audio controls preload="none" src={article.audioUrl} className="w-full">
        Il tuo browser non supporta la riproduzione audio.
      </audio>
    </section>
  );
}

function ArticleTags({ article }: ArticleOnlyProps) {
  const tagLine = article.tags.length
    ? article.tags
        .slice(0, 3)
        .map((tag) => tag.name)
        .join(" / ")
    : article.categoryName;

  if (!tagLine) return null;

  return (
    <p className="max-w-3xl font-heading text-[11px] leading-snug font-bold tracking-[0.14em] break-words whitespace-normal text-muted uppercase">
      {tagLine}
    </p>
  );
}

function RelatedArticlesSection({ article, relatedArticles }: RelatedArticlesSectionProps) {
  if (relatedArticles.length === 0) return null;

  return (
    <section className="bg-background py-10 sm:py-14 lg:py-16">
      <div className={publicContentClassName}>
        <div className="mb-5 flex flex-col gap-3 border-t-2 border-foreground pt-4 md:flex-row md:items-center md:justify-between">
          <p className="font-heading text-[13px] font-semibold text-muted sm:text-[14px]">
            Dal numero: {article.issueTitle}
          </p>
          <Link
            href={`/uscite/${article.issueSlug}`}
            className="w-fit font-heading text-xs font-bold tracking-[0.06em] text-accent uppercase transition-colors duration-(--motion-fast) md:hover:text-foreground"
          >
            Visualizza il numero
          </Link>
        </div>

        <div className="grid border-l border-t border-foreground md:grid-cols-2 xl:grid-cols-3">
          {relatedArticles.map((item) => (
            <DossierArticleCard
              key={item.article.id}
              article={item.article}
              eyebrow={formatTags(item.article) || item.article.categoryName || ""}
              number={item.number}
              variant="constellationSecondary"
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
    <main id="top" className="flex flex-1 flex-col bg-background font-heading text-foreground">
      <article id="main-content" tabIndex={-1} className="focus:outline-none">
        <header className="relative isolate w-full overflow-hidden bg-background">
          <div className={`${publicContentClassName} relative py-7 sm:py-9 lg:py-14`}>
            <div
              className={`${publicTypography.issueBackgroundNumber} pointer-events-none absolute top-5 right-5 z-0 text-accent/15 select-none [-webkit-text-stroke:0.45px_rgba(0,0,0,0.25)]`}
              aria-hidden
            >
              {formatArticleNumber(articleNumber)}
            </div>

            <div className="relative z-10 w-full">
              <div className="mb-5">
                <ArticleTags article={article} />
              </div>
              <h1 className={`${publicTypography.homeHeroTitle} w-full text-foreground`}>
                <StyledTitle title={article.title} titleStyled={article.titleStyled} />
              </h1>
              {article.excerpt ? (
                <div className="mt-8 w-full border-t-2 border-foreground pt-5">
                  <p className="font-editorial text-[clamp(18px,1.8vw,25px)] leading-[1.36] text-body-text italic">
                    {article.excerpt}
                  </p>
                  <div className="mt-6">
                    <ArticleMetaRail article={article} />
                  </div>
                </div>
              ) : (
                <div className="mt-7">
                  <ArticleMetaRail article={article} />
                </div>
              )}
            </div>
          </div>
        </header>

        {article.imageUrl ? (
          <figure className="bg-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element -- CMS media is proxied through the app and may be private Blob-backed. */}
            <img
              src={article.imageUrl}
              alt={article.imageAlt ?? ""}
              className="mx-auto aspect-[16/9] w-full max-w-400 object-cover"
            />
          </figure>
        ) : null}

        <div className="bg-surface py-12 sm:py-16 lg:py-20">
          <div
            className={`${publicContentClassName} grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,760px)_minmax(0,1fr)]`}
          >
            <aside className="space-y-5 lg:pt-1">
              <ArticleAudio article={article} />
            </aside>

            <div className="space-y-10">
              <PublicRichText value={article.contentRich} />
            </div>
          </div>
        </div>

        <RelatedArticlesSection article={article} relatedArticles={relatedArticles} />
      </article>
    </main>
  );
}
