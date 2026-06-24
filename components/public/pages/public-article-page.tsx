import { DossierArticleCard, PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { publicContentClassName } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { PublicRichText } from "@/components/public/rich-text";
import { formatTags } from "@/components/public/sections/dossier/dossier-format";
import { i18n } from "@/lib/i18n";
import { buildArticlePageJsonLd } from "@/lib/seo";

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
  const text = i18n.public.articlePage;
  const metaItems = [
    { key: "issue", label: article.issueTitle, href: `/uscite/${article.issueSlug}` },
    { key: "category", label: article.categoryName },
    article.authorName ? { key: "author", label: article.authorName } : null,
    { key: "date", label: formatArticleDate(article.publishedAt), dateTime: article.publishedAt },
  ].filter((item) => item !== null);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <PublicMetaRail items={metaItems} />

      {article.audioUrl ? (
        <Link
          href={`/articoli/${article.slug}/ascolta`}
          className="w-fit border-2 border-foreground bg-foreground px-3 py-2 font-heading text-[11px] font-extrabold tracking-[0.12em] text-background uppercase transition-transform duration-(--motion-fast) hover:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {text.audioCta}
        </Link>
      ) : null}
    </div>
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

  const text = i18n.public.articlePage;

  return (
    <section className="bg-background py-10 sm:py-14 lg:py-16">
      <div className={publicContentClassName}>
        <div className="mb-5 flex flex-col gap-3 border-t-2 border-foreground pt-4 md:flex-row md:items-center md:justify-between">
          <p className="font-heading text-[13px] font-semibold text-muted sm:text-[14px]">
            {text.issuePrefix} {article.issueTitle}
          </p>
          <Link
            href={`/uscite/${article.issueSlug}`}
            className="w-fit font-heading text-xs font-bold tracking-[0.06em] text-accent uppercase transition-colors duration-(--motion-fast) md:hover:text-foreground"
          >
            {text.viewIssue}
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildArticlePageJsonLd(article, article.excerpt)),
        }}
      />
      <article id="main-content" tabIndex={-1} className="focus:outline-none">
        <PublicPageHero
          as="header"
          title={article.title}
          titleStyled={article.titleStyled}
          backgroundCode={formatArticleNumber(articleNumber)}
          description={article.excerpt}
          eyebrow={<ArticleTags article={article} />}
          meta={<ArticleMetaRail article={article} />}
        />

        {article.imageUrl ? (
          <figure className="bg-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element -- CMS media is proxied through the app and may be private Blob-backed. */}
            <img
              src={article.imageUrl}
              alt={article.imageAlt ?? ""}
              className="mx-auto aspect-video w-full max-w-400 object-cover"
            />
          </figure>
        ) : null}

        <div className="bg-surface py-12 sm:py-16 lg:py-20">
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
