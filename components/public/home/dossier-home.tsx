import Image from "next/image";

import { AutoClampText } from "@/components/public/home/auto-clamp-text";
import {
  type HomeIssueArticle,
  type NarrativeHomeBlock,
  composeNarrativeHomeBlocks,
} from "@/components/public/home/home-view-model";
import { StyledTitle } from "@/components/public/styled-title";
import { i18n } from "@/lib/i18n";

import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";

type DossierHomeProps = {
  issue: PublicCurrentIssueDetail;
};

type DossierArticleCardProps = {
  article: HomeIssueArticle;
  eyebrow: string;
  number: number;
  variant?:
    | "standard"
    | "featured"
    | "clusterFeatured"
    | "constellationSecondary"
    | "compact"
    | "closing";
  className?: string;
};

function formatTags(article: HomeIssueArticle) {
  return article.tags
    .slice(0, 3)
    .map((tag) => tag.name)
    .join(" / ");
}

function blockEyebrow(block: NarrativeHomeBlock, article: HomeIssueArticle) {
  return block.title || formatTags(article) || article.categoryName || "";
}

function articleEyebrow(article: HomeIssueArticle) {
  return formatTags(article) || article.categoryName || "";
}

function sortUnpaginatedArticles(articles: HomeIssueArticle[]) {
  return [...articles].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1;
    }

    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

function ArticleMeta({
  article,
  tone = "light",
}: {
  article: HomeIssueArticle;
  tone?: "light" | "dark" | "accent";
}) {
  const text = i18n.public.home.articleCard;
  const muted =
    tone === "dark" ? "text-dark-muted" : tone === "accent" ? "text-[#f4ebdd]/80" : "text-muted";
  const separator = tone === "accent" ? "bg-foreground" : "bg-accent";
  const items = [
    article.categoryName,
    article.authorName,
    text.readingTimeLabel(article.readingTimeMinutes),
    article.hasAudio ? text.audioLabel : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <div
      className={`flex flex-wrap items-center gap-3 font-heading text-xs font-semibold ${muted}`}
    >
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="flex items-center gap-3">
          {index > 0 ? <span className={`size-1 rounded-[1px] ${separator}`} aria-hidden /> : null}
          {item}
        </span>
      ))}
    </div>
  );
}

function formatArticleNumber(value: number) {
  return String(value).padStart(2, "0");
}

function getArticleNumber(articleNumbers: Map<string, number>, article: HomeIssueArticle) {
  return articleNumbers.get(article.id) ?? 1;
}

function BlockTitle({
  block,
  primaryClassName,
}: {
  block: NarrativeHomeBlock;
  primaryClassName?: string;
}) {
  if (!block.title) {
    return null;
  }

  return (
    <StyledTitle
      title={block.title}
      titleStyled={block.titleStyled}
      primaryClassName={primaryClassName}
    />
  );
}

function getNarrativeVariantClasses(variant: NarrativeHomeBlock["variant"]) {
  switch (variant) {
    case "red":
      return {
        section: "bg-accent text-background",
        eyebrow: "text-[#f4ebdd]/80",
        metaTone: "accent" as const,
        titlePrimary: "text-foreground",
        excerpt: "text-[#f4ebdd]",
        description: "text-[#f4ebdd]/80",
        image: "border-[rgba(244,235,221,0.34)] grayscale",
      };
    case "default":
      return {
        section: "bg-background text-foreground",
        eyebrow: "text-muted",
        metaTone: "light" as const,
        titlePrimary: "text-accent",
        excerpt: "text-body-text",
        description: "text-muted",
        image: "border-foreground grayscale",
      };
    case "black":
      return {
        section: "bg-foreground text-background",
        eyebrow: "text-dark-muted",
        metaTone: "dark" as const,
        titlePrimary: "text-accent",
        excerpt: "text-[#e7ddcb]",
        description: "text-dark-muted",
        image: "border-dark-border grayscale",
      };
  }
}

function LeadBlock({
  block,
  articleNumbers,
}: {
  block: NarrativeHomeBlock;
  articleNumbers: Map<string, number>;
}) {
  const article = block.featuredArticle ?? block.articles[0];

  if (!article) {
    return null;
  }

  const tagLine = formatTags(article);
  const variantClasses = getNarrativeVariantClasses(block.variant);

  return (
    <section id="dossier" className={`mb-10 scroll-mt-20 lg:mb-12 ${variantClasses.section}`}>
      <div className="px-4 py-10 sm:px-6 md:py-12 lg:px-12">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] md:gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:gap-12">
          <div>
            <div className="mb-6 flex items-start justify-between gap-4">
              <span
                className={`font-heading text-[40px] leading-[0.78] font-black tracking-[-0.04em] sm:text-[48px] md:text-[56px] ${variantClasses.titlePrimary}`}
              >
                {formatArticleNumber(getArticleNumber(articleNumbers, article))}
              </span>
              {tagLine ? (
                <p
                  className={`mt-1.5 max-w-[52vw] text-right font-heading text-[11px] font-bold tracking-[0.14em] break-words uppercase md:max-w-[24ch] ${variantClasses.eyebrow}`}
                >
                  {tagLine}
                </p>
              ) : null}
            </div>
            <h2 className="max-w-[13ch] font-heading text-[clamp(42px,6.6vw,104px)] leading-[0.88] font-black tracking-[-0.052em] text-balance">
              <StyledTitle
                title={article.title}
                titleStyled={article.titleStyled}
                primaryClassName={variantClasses.titlePrimary}
              />
            </h2>
            {article.excerpt ? (
              <p
                className={`mt-6 max-w-[58ch] font-editorial text-[clamp(19px,1.6vw,24px)] leading-[1.36] italic ${variantClasses.excerpt}`}
              >
                {article.excerpt}
              </p>
            ) : null}
            {block.description ? (
              <p
                className={`mt-5 max-w-[54ch] font-editorial text-[17px] leading-normal ${variantClasses.description}`}
              >
                {block.description}
              </p>
            ) : null}
            <div className="mt-7">
              <ArticleMeta article={article} tone={variantClasses.metaTone} />
            </div>
          </div>

          {article.imageUrl ? (
            <div
              className={`relative min-h-76 overflow-hidden border sm:min-h-82 md:min-h-full lg:min-h-120 ${variantClasses.image}`}
            >
              <Image
                src={article.imageUrl}
                alt=""
                fill
                sizes="(min-width: 768px) 45vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DossierArticleCard({
  article,
  eyebrow,
  number,
  variant = "standard",
  className = "",
}: DossierArticleCardProps) {
  const hasImage = Boolean(article.imageUrl);
  const isCompact = variant === "compact";
  const isClosing = variant === "closing";
  const isClusterFeatured = variant === "clusterFeatured";
  const isConstellationSecondary = variant === "constellationSecondary";
  const showImageAfterTitle = isClusterFeatured || isConstellationSecondary;
  const summary = isClusterFeatured ? (article.contentPreview ?? article.excerpt) : article.excerpt;
  const showImage = Boolean(article.imageUrl) && !isCompact;
  const image = showImage ? (
    <div
      className={`relative overflow-hidden border border-foreground grayscale ${
        isClusterFeatured
          ? "mt-5 h-40 sm:h-44 md:h-52 lg:h-[min(30vh,250px)]"
          : isClosing
            ? "mt-6 h-52 sm:h-58 md:mt-0 md:h-full md:min-h-86 lg:min-h-100"
            : isConstellationSecondary
              ? "mt-5 h-32 sm:h-34 md:h-38"
              : "mt-5 h-40 sm:h-44 md:h-52"
      }`}
    >
      <Image
        src={article.imageUrl!}
        alt=""
        fill
        sizes="(min-width: 768px) 38vw, 100vw"
        className="object-cover transition-transform duration-(--motion-slow) group-hover:scale-[1.025]"
      />
    </div>
  ) : null;

  return (
    <article
      className={`group flex h-full min-h-full overflow-hidden border-foreground bg-background transition-[background,box-shadow] duration-(--motion-fast) hover:bg-surface-hover hover:shadow-(--interactive-rail-shadow) ${
        isClosing
          ? "border px-5 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8"
          : "border-r border-b px-5 py-5 sm:px-6 sm:py-6 md:px-7 md:py-7"
      } ${
        isClosing
          ? "flex-col md:grid md:grid-cols-[minmax(0,0.62fr)_minmax(240px,0.38fr)] md:items-stretch md:gap-8"
          : "flex-col"
      } ${className}`}
    >
      <div
        className={
          isClosing
            ? "flex h-full min-h-full min-w-0 flex-col"
            : isClusterFeatured
              ? "flex h-full min-h-0 min-w-0 flex-col"
              : "flex h-full min-h-0 min-w-0 flex-col"
        }
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <span
            className={`font-heading leading-[0.78] font-black tracking-[-0.04em] text-accent ${
              isClusterFeatured
                ? "text-[40px] sm:text-[48px] md:text-[56px]"
                : isClosing
                  ? "text-[28px] sm:text-[30px] md:text-[36px]"
                  : "text-[40px] sm:text-[48px]"
            }`}
          >
            {formatArticleNumber(number)}
          </span>
          <span
            className={`mt-1.5 max-w-[52vw] text-right font-heading text-[11px] font-bold tracking-[0.12em] break-words text-muted uppercase ${isClosing ? "md:max-w-52" : "md:max-w-[24ch]"}`}
          >
            {eyebrow}
          </span>
        </div>

        <h3
          className={`font-heading leading-[1.05] font-black tracking-[-0.032em] text-foreground ${
            isClusterFeatured
              ? "text-[25px] sm:text-[27px] md:text-[32px]"
              : isClosing
                ? "max-w-[16ch] text-[28px] sm:text-[30px] md:text-[40px] lg:text-[46px]"
                : isConstellationSecondary
                  ? "text-[23px] sm:text-[24px] md:text-[28px]"
                  : hasImage && !isCompact
                    ? "text-[24px] sm:text-[25px] md:text-[30px]"
                    : "text-[27px] sm:text-[29px] md:text-[36px]"
          }`}
        >
          <StyledTitle title={article.title} titleStyled={article.titleStyled} />
        </h3>
        {showImageAfterTitle ? image : null}
        {summary ? (
          isClusterFeatured ? (
            <AutoClampText className="mt-4 flex-1 font-editorial text-[17px] leading-normal text-body-text md:text-[18px]">
              {summary}
            </AutoClampText>
          ) : (
            <p
              className={`mt-4 min-h-0 overflow-hidden font-editorial leading-normal text-body-text ${
                isClosing
                  ? "max-w-[54ch] text-[18px] leading-[1.45] md:text-[20px]"
                  : isConstellationSecondary
                    ? "line-clamp-4 flex-1 text-[16px] md:text-[17px]"
                    : "flex-1 text-[16px] md:text-[17px]"
              }`}
            >
              {summary}
            </p>
          )
        ) : null}
        <div className={`mt-auto ${isClosing ? "pt-8" : "pt-6"}`}>
          <ArticleMeta article={article} />
        </div>
      </div>

      {showImageAfterTitle ? null : image}
    </article>
  );
}

function BodyBlock({
  block,
  articleNumbers,
}: {
  block: NarrativeHomeBlock;
  articleNumbers: Map<string, number>;
}) {
  const featured = block.featuredArticle ?? block.articles[0] ?? null;
  const secondary = featured
    ? block.articles.filter((article) => article.id !== featured.id)
    : block.articles;
  const featuredOnRight = block.featuredPlacement === "right";
  const featuredCard = featured ? (
    <div className="relative h-full min-h-full">
      <DossierArticleCard
        article={featured}
        eyebrow={articleEyebrow(featured)}
        number={getArticleNumber(articleNumbers, featured)}
        variant="clusterFeatured"
        className="md:absolute md:inset-0"
      />
    </div>
  ) : null;
  const secondaryCards = (
    <div className="grid h-full min-h-full">
      {secondary.map((article) => (
        <DossierArticleCard
          key={article.id}
          article={article}
          eyebrow={articleEyebrow(article)}
          number={getArticleNumber(articleNumbers, article)}
          variant="constellationSecondary"
        />
      ))}
    </div>
  );
  const gridColumnsClass = featuredOnRight
    ? "md:grid-cols-[minmax(0,0.58fr)_minmax(260px,0.42fr)]"
    : "md:grid-cols-[minmax(260px,0.42fr)_minmax(0,0.58fr)]";

  return (
    <section className="scroll-mt-20 px-4 py-10 sm:px-6 md:py-12 lg:px-12">
      <BlockSectionIntro block={block} />
      <div className={`grid items-stretch border-l border-t border-foreground ${gridColumnsClass}`}>
        {featuredOnRight ? secondaryCards : featuredCard}
        {featuredOnRight ? featuredCard : secondaryCards}
      </div>
    </section>
  );
}

function BlockSectionIntro({ block }: { block: NarrativeHomeBlock }) {
  if (!block.title && !block.description) {
    return null;
  }

  return (
    <div className="pb-6 lg:pb-7">
      {block.title ? (
        <h2 className="font-heading text-[clamp(34px,4vw,64px)] leading-[0.9] font-black tracking-[-0.045em] text-foreground uppercase">
          <BlockTitle block={block} />
        </h2>
      ) : null}
      {block.title ? (
        <div className="mt-6 border-t border-foreground pt-5">
          {block.description ? (
            <p className="w-full font-editorial text-[clamp(17px,1.4vw,21px)] leading-normal text-body-text">
              {block.description}
            </p>
          ) : null}
        </div>
      ) : block.description ? (
        <p className="mt-4 w-full font-editorial text-[clamp(17px,1.4vw,21px)] leading-normal text-body-text">
          {block.description}
        </p>
      ) : null}
    </div>
  );
}

function FeatureBreakBlock({
  block,
  articleNumbers,
}: {
  block: NarrativeHomeBlock;
  articleNumbers: Map<string, number>;
}) {
  const article = block.featuredArticle ?? block.articles[0];

  if (!article) {
    return null;
  }

  const variantClasses = getNarrativeVariantClasses(block.variant);
  const eyebrow = blockEyebrow(block, article);
  const showBorder = block.variant === "default";
  const imageOnRight = block.featuredPlacement === "right";
  const imageBorderClass = imageOnRight
    ? "border-t md:border-t-0 md:border-l"
    : "border-b md:border-r md:border-b-0";
  const image = article.imageUrl ? (
    <div
      className={`relative min-h-70 sm:min-h-76 md:min-h-full ${showBorder ? `${imageBorderClass} ${variantClasses.image}` : "grayscale"}`}
    >
      <Image
        src={article.imageUrl}
        alt=""
        fill
        sizes="(min-width: 768px) 42vw, 100vw"
        className="object-cover"
      />
    </div>
  ) : null;

  return (
    <section className="scroll-mt-20 px-4 py-10 sm:px-6 md:py-12 lg:px-12">
      <div
        className={`grid md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] ${variantClasses.section} ${showBorder ? "border border-current" : ""}`}
      >
        {imageOnRight ? null : image}
        <article className="px-5 py-5 sm:px-6 sm:py-6 md:p-8 lg:p-9">
          <div className="mb-6 flex items-start justify-between gap-4">
            <span
              className={`font-heading text-[40px] leading-[0.78] font-black tracking-[-0.04em] sm:text-[48px] md:text-[56px] ${variantClasses.titlePrimary}`}
            >
              {formatArticleNumber(getArticleNumber(articleNumbers, article))}
            </span>
            {eyebrow ? (
              <span
                className={`mt-1.5 max-w-[52vw] text-right font-heading text-[11px] font-bold tracking-[0.12em] break-words uppercase md:max-w-[24ch] ${variantClasses.eyebrow}`}
              >
                {eyebrow}
              </span>
            ) : null}
          </div>
          <h2 className="max-w-[14ch] font-heading text-[clamp(38px,5vw,76px)] leading-[0.9] font-black tracking-tighter text-balance">
            <StyledTitle
              title={article.title}
              titleStyled={article.titleStyled}
              primaryClassName={variantClasses.titlePrimary}
            />
          </h2>
          {article.excerpt ? (
            <p
              className={`mt-6 max-w-[54ch] font-editorial text-[19px] leading-[1.38] md:text-[22px] ${variantClasses.excerpt}`}
            >
              {article.excerpt}
            </p>
          ) : null}
          {block.description ? (
            <p
              className={`mt-5 max-w-[48ch] font-editorial text-[17px] leading-normal ${variantClasses.description}`}
            >
              {block.description}
            </p>
          ) : null}
          <div className="mt-7">
            <ArticleMeta article={article} tone={variantClasses.metaTone} />
          </div>
        </article>
        {imageOnRight ? image : null}
      </div>
    </section>
  );
}

function ClosingBlock({
  block,
  articleNumbers,
}: {
  block: NarrativeHomeBlock;
  articleNumbers: Map<string, number>;
}) {
  const article = block.featuredArticle ?? block.articles[0];

  if (!article) {
    return null;
  }

  const tagLine = formatTags(article);
  const variantClasses = getNarrativeVariantClasses(block.variant);
  const blockHasCopy = Boolean(block.title || block.description);
  const closingText = i18n.public.home.closing;
  const editorialPanelBorder = block.variant === "default" ? "border border-foreground" : "";
  const image = article.imageUrl ? (
    <div className="relative min-h-48 overflow-hidden border border-foreground grayscale sm:min-h-52 md:min-h-64 lg:min-h-[min(34vh,360px)]">
      <Image
        src={article.imageUrl}
        alt=""
        fill
        sizes="(min-width: 768px) 34vw, 100vw"
        className="object-cover"
      />
    </div>
  ) : null;

  return (
    <section className="px-4 py-10 sm:px-6 md:py-12 lg:px-12">
      <div className="grid gap-8 md:grid-cols-[minmax(220px,0.38fr)_minmax(0,0.62fr)] md:gap-10 lg:grid-cols-[minmax(240px,0.38fr)_minmax(0,0.62fr)] lg:gap-12">
        <aside className={`p-6 md:p-8 lg:p-9 ${variantClasses.section} ${editorialPanelBorder}`}>
          {blockHasCopy ? (
            <div>
              {block.title ? (
                <h2 className="max-w-[11ch] font-heading text-[clamp(34px,4.2vw,68px)] leading-[0.9] font-black tracking-[-0.046em] uppercase text-balance">
                  <BlockTitle block={block} primaryClassName={variantClasses.titlePrimary} />
                </h2>
              ) : null}
              {block.description ? (
                <p
                  className={`mt-5 max-w-[36ch] font-editorial text-[18px] leading-[1.44] md:text-[20px] ${variantClasses.description}`}
                >
                  {block.description}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full items-end">
              <p
                className={`max-w-[28ch] font-editorial text-[18px] leading-[1.44] italic md:text-[20px] ${variantClasses.description}`}
              >
                {closingText.fallback}
              </p>
            </div>
          )}
        </aside>

        <article className="min-w-0 border border-foreground bg-background text-foreground">
          {image}
          <div className="px-6 pt-6 pb-6 md:px-8 md:pt-7 md:pb-8">
            <div className="mb-5 flex items-start justify-between gap-4">
              <span className="font-heading text-[40px] leading-[0.78] font-black tracking-[-0.04em] text-accent sm:text-[48px] md:text-[56px]">
                {formatArticleNumber(getArticleNumber(articleNumbers, article))}
              </span>
              {tagLine ? (
                <p className="mt-1.5 max-w-[52vw] text-right font-heading text-[11px] font-bold tracking-[0.14em] break-words text-muted uppercase md:max-w-[24ch]">
                  {tagLine}
                </p>
              ) : null}
            </div>

            <h3 className="w-full font-heading text-[clamp(32px,4.6vw,72px)] leading-[0.92] font-black tracking-[-0.048em] text-balance">
              <StyledTitle
                title={article.title}
                titleStyled={article.titleStyled}
                primaryClassName="text-accent"
              />
            </h3>

            {article.excerpt ? (
              <p className="mt-5 w-full font-editorial text-[18px] leading-[1.42] text-body-text italic md:text-[21px]">
                {article.excerpt}
              </p>
            ) : null}
            <div className="pt-7">
              <ArticleMeta article={article} />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function getArticleNumbers(blocks: NarrativeHomeBlock[]) {
  const numbers = new Map<string, number>();

  assignArticleNumbers(numbers, blocks.flatMap(getBlockNumberingArticles));

  return numbers;
}

function getBlockNumberingArticles(block: NarrativeHomeBlock) {
  if (block.type !== "body" || block.featuredPlacement !== "right" || !block.featuredArticle) {
    return block.articles;
  }

  return [
    ...block.articles.filter((article) => article.id !== block.featuredArticle?.id),
    block.featuredArticle,
  ];
}

function assignArticleNumbers(numbers: Map<string, number>, articles: HomeIssueArticle[]) {
  for (const article of articles) {
    if (!numbers.has(article.id)) {
      numbers.set(article.id, numbers.size + 1);
    }
  }
}

function getUnpaginatedArticles(issue: PublicCurrentIssueDetail, blocks: NarrativeHomeBlock[]) {
  const paginatedArticleIds = new Set(
    blocks.flatMap((block) => block.articles.map((article) => article.id)),
  );

  return issue.articles.filter((article) => !paginatedArticleIds.has(article.id));
}

function UnpaginatedArticleRow({
  articles,
  id,
  startNumber = 1,
}: {
  articles: HomeIssueArticle[];
  id?: string;
  startNumber?: number;
}) {
  const orderedArticles = sortUnpaginatedArticles(articles);

  if (orderedArticles.length === 0) {
    return null;
  }

  return (
    <section id={id} className="scroll-mt-20 px-4 py-10 sm:px-6 lg:px-12 lg:py-12">
      <div className="grid border-l border-t border-foreground md:grid-cols-2 xl:grid-cols-3">
        {orderedArticles.map((article, index) => (
          <DossierArticleCard
            key={article.id}
            article={article}
            eyebrow={formatTags(article) || article.categoryName || ""}
            number={startNumber + index}
            variant="constellationSecondary"
          />
        ))}
      </div>
    </section>
  );
}

function renderBlock(block: NarrativeHomeBlock, articleNumbers: Map<string, number>) {
  switch (block.type) {
    case "opening":
      return <LeadBlock key={block.id} block={block} articleNumbers={articleNumbers} />;
    case "body":
      return <BodyBlock key={block.id} block={block} articleNumbers={articleNumbers} />;
    case "rupture":
      return <FeatureBreakBlock key={block.id} block={block} articleNumbers={articleNumbers} />;
    case "closing":
      return <ClosingBlock key={block.id} block={block} articleNumbers={articleNumbers} />;
  }
}
export function DossierHome({ issue }: DossierHomeProps) {
  const blocks = composeNarrativeHomeBlocks(issue);

  if (blocks.length === 0) {
    return <UnpaginatedArticleRow id="dossier" articles={issue.articles} />;
  }

  const unpaginatedArticles = getUnpaginatedArticles(issue, blocks);
  const contentBlocks = blocks.filter((block) => block.type !== "closing");
  const closingBlocks = blocks.filter((block) => block.type === "closing");
  const articleNumbers = getArticleNumbers(contentBlocks);
  const unpaginatedStartNumber = articleNumbers.size + 1;

  assignArticleNumbers(articleNumbers, sortUnpaginatedArticles(unpaginatedArticles));
  assignArticleNumbers(
    articleNumbers,
    closingBlocks.flatMap((block) => block.articles),
  );

  return (
    <div className="bg-background">
      {contentBlocks.map((block) => renderBlock(block, articleNumbers))}
      <UnpaginatedArticleRow articles={unpaginatedArticles} startNumber={unpaginatedStartNumber} />
      {closingBlocks.map((block) => renderBlock(block, articleNumbers))}
    </div>
  );
}
