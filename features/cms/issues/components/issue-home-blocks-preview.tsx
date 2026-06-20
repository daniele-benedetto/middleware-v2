import { CmsBody, CmsMetaText } from "@/components/cms/primitives";
import { normalizeHomeBlock } from "@/lib/issues/home-block-rules";
import { cn } from "@/lib/utils";

import type { IssueHomeBlocks } from "@/lib/server/modules/issues/schema";

export type IssueHomeBlockPreviewArticle = {
  id: string;
  title: string;
  isFeatured: boolean;
  position: number;
  categoryName?: string | null;
  categorySlug?: string | null;
};

export type IssueHomeBlocksPreviewText = {
  articleCount: (count: number) => string;
  preview: string;
  previewEmpty: string;
  previewFeatured: string;
  typeConstellation: string;
  typeClosing: string;
  typeOpening: string;
  typeRupture: string;
  typeSequence: string;
};

function getArticleCategoryLabel(article: IssueHomeBlockPreviewArticle) {
  return article.categoryName || article.categorySlug || null;
}

function getBlockTypeLabel(
  type: IssueHomeBlocks[number]["type"],
  text: IssueHomeBlocksPreviewText,
) {
  switch (type) {
    case "opening":
      return text.typeOpening;
    case "constellation":
      return text.typeConstellation;
    case "rupture":
      return text.typeRupture;
    case "sequence":
      return text.typeSequence;
    case "closing":
      return text.typeClosing;
  }
}

function ArticleCategoryBadge({ article }: { article: IssueHomeBlockPreviewArticle }) {
  const categoryLabel = getArticleCategoryLabel(article);

  if (!categoryLabel) {
    return null;
  }

  return (
    <span className="shrink-0 border border-border px-1.5 py-0.5 font-ui text-[9px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
      {categoryLabel}
    </span>
  );
}

function resolvePreviewArticles({
  block,
  blocks,
  articles,
  articlesById,
}: {
  block: IssueHomeBlocks[number];
  blocks: IssueHomeBlocks;
  articles: IssueHomeBlockPreviewArticle[];
  articlesById: Map<string, IssueHomeBlockPreviewArticle>;
}) {
  if (block.source === "remainder") {
    const manuallyUsedIds = new Set(
      blocks.flatMap((candidate) => (candidate.source === "remainder" ? [] : candidate.articleIds)),
    );
    return articles.filter((article) => !manuallyUsedIds.has(article.id));
  }

  return block.articleIds
    .map((articleId) => articlesById.get(articleId))
    .filter((article): article is IssueHomeBlockPreviewArticle => Boolean(article));
}

export function IssueHomeBlocksPreview({
  blocks,
  articles,
  text,
}: {
  blocks: IssueHomeBlocks;
  articles: IssueHomeBlockPreviewArticle[];
  text: IssueHomeBlocksPreviewText;
}) {
  if (blocks.length === 0) {
    return null;
  }

  const articlesById = new Map(articles.map((article) => [article.id, article]));

  return (
    <section className="border border-border bg-card-hover p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <CmsMetaText variant="category">{text.preview}</CmsMetaText>
        <CmsBody size="sm" tone="muted">
          {text.articleCount(blocks.length)}
        </CmsBody>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {blocks.map((rawBlock, index) => {
          const block = normalizeHomeBlock(rawBlock);
          const resolvedArticles = resolvePreviewArticles({
            block,
            blocks,
            articles,
            articlesById,
          });
          const featuredArticle = block.featuredArticleId
            ? articlesById.get(block.featuredArticleId)
            : (resolvedArticles.find((article) => article.isFeatured) ??
              resolvedArticles[0] ??
              null);
          const isHeroPreview = block.type === "opening" || block.type === "rupture";
          const isClosingPreview = block.type === "closing";

          return (
            <article
              key={block.id}
              className={cn(
                "border border-border bg-white p-3",
                isHeroPreview && "md:col-span-2 xl:col-span-2",
                isClosingPreview && "bg-foreground text-background",
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "font-heading leading-none font-black text-accent",
                    isHeroPreview ? "text-[42px]" : "text-[24px]",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "text-right font-ui text-[10px] font-bold tracking-[0.08em] uppercase",
                    isClosingPreview ? "text-dark-muted" : "text-muted-foreground",
                  )}
                >
                  {getBlockTypeLabel(block.type, text)}
                </span>
              </div>
              {block.title ? (
                <p
                  className={cn(
                    "font-ui text-[12px] font-bold uppercase",
                    isClosingPreview ? "text-accent" : "text-foreground",
                  )}
                >
                  {block.title}
                </p>
              ) : null}
              {block.description ? (
                <p
                  className={cn(
                    "mt-2 line-clamp-3 font-editorial text-[13px] leading-normal",
                    isClosingPreview ? "text-dark-muted" : "text-body-text",
                  )}
                >
                  {block.description}
                </p>
              ) : null}
              <div className="mt-3 space-y-1.5">
                {resolvedArticles.length === 0 ? (
                  <CmsBody size="sm" tone="muted">
                    {text.previewEmpty}
                  </CmsBody>
                ) : (
                  resolvedArticles.map((article) => (
                    <div
                      key={article.id}
                      className={cn(
                        "flex items-start justify-between gap-2 border-t pt-1.5",
                        isClosingPreview ? "border-dark-border" : "border-border",
                      )}
                    >
                      <span
                        className={cn(
                          "min-w-0 font-ui font-bold",
                          isHeroPreview ? "text-[15px]" : "text-[11px]",
                          isClosingPreview ? "text-background" : "text-foreground",
                        )}
                      >
                        {article.title}
                      </span>
                      <span className="flex shrink-0 flex-wrap justify-end gap-1">
                        <ArticleCategoryBadge article={article} />
                        {featuredArticle?.id === article.id ? (
                          <span className="font-ui text-[9px] font-bold tracking-[0.08em] text-accent uppercase">
                            {text.previewFeatured}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
