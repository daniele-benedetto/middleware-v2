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
    | "sequenceFeatured"
    | "constellationSecondary"
    | "constellationWide"
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
      className={`flex flex-wrap items-center gap-3.5 font-heading text-[12.5px] font-semibold ${muted}`}
    >
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="flex items-center gap-3.5">
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

function getOpeningVariantClasses(variant: NarrativeHomeBlock["variant"]) {
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

function LeadBlock({ block }: { block: NarrativeHomeBlock }) {
  const article = block.featuredArticle ?? block.articles[0];

  if (!article) {
    return null;
  }

  const tagLine = formatTags(article);
  const variantClasses = getOpeningVariantClasses(block.variant);

  return (
    <section id="dossier" className={`scroll-mt-20 ${variantClasses.section}`}>
      <div className="px-4 py-13 sm:px-6 lg:px-12 lg:pb-15">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:gap-12">
          <div>
            {tagLine ? (
              <p
                className={`mb-6 font-heading text-[11px] font-bold tracking-[0.14em] uppercase ${variantClasses.eyebrow}`}
              >
                {tagLine}
              </p>
            ) : null}
            <h2 className="max-w-[13ch] font-heading text-[clamp(42px,6.6vw,104px)] leading-[0.88] font-black tracking-[-0.052em] text-balance">
              <StyledTitle
                title={article.title}
                titleStyled={article.titleStyled}
                primaryClassName={variantClasses.titlePrimary}
              />
            </h2>
            {article.excerpt ? (
              <p
                className={`mt-7 max-w-[58ch] font-editorial text-[clamp(19px,1.7vw,25px)] leading-[1.34] italic ${variantClasses.excerpt}`}
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
            <div className="mt-8">
              <ArticleMeta article={article} tone={variantClasses.metaTone} />
            </div>
          </div>

          {article.imageUrl ? (
            <div
              className={`relative min-h-95 overflow-hidden border lg:min-h-130 ${variantClasses.image}`}
            >
              <Image
                src={article.imageUrl}
                alt=""
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
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
  const isSequenceFeatured = variant === "sequenceFeatured";
  const isConstellationSecondary = variant === "constellationSecondary";
  const isConstellationWide = variant === "constellationWide";
  const showImageAfterTitle = isClusterFeatured || isConstellationSecondary;
  const summary =
    isClusterFeatured || isSequenceFeatured
      ? (article.contentPreview ?? article.excerpt)
      : article.excerpt;
  const showImage = Boolean(article.imageUrl) && !isCompact;
  const image = showImage ? (
    <div
      className={`relative overflow-hidden border border-foreground grayscale ${
        isClusterFeatured
          ? "mt-5 h-44 md:h-52 lg:h-[min(32vh,260px)]"
          : isClosing
            ? "mt-6 h-58 md:h-72 lg:mt-0 lg:h-full lg:min-h-100"
            : isConstellationSecondary || isConstellationWide
              ? `mt-5 h-30 md:h-34 ${isConstellationWide ? "lg:mt-0 lg:h-full lg:min-h-full" : ""}`
              : "mt-5 h-45 md:h-52"
      }`}
    >
      <Image
        src={article.imageUrl!}
        alt=""
        fill
        sizes="(min-width: 1024px) 33vw, 100vw"
        className="object-cover transition-transform duration-(--motion-slow) group-hover:scale-[1.025]"
      />
    </div>
  ) : null;

  return (
    <article
      className={`group flex h-full min-h-full overflow-hidden border-foreground bg-background transition-[background,box-shadow] duration-(--motion-fast) hover:bg-surface-hover hover:shadow-(--interactive-rail-shadow) ${
        isClosing
          ? "border px-6 py-6 md:px-8 md:py-8"
          : "border-r border-b px-6 py-6 md:px-7 md:py-7"
      } ${
        isClosing
          ? "flex-col lg:grid lg:grid-cols-[minmax(0,0.62fr)_minmax(260px,0.38fr)] lg:items-stretch lg:gap-8"
          : isConstellationWide
            ? "flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.42fr)] lg:items-stretch lg:gap-6"
            : "flex-col"
      } ${className}`}
    >
      <div
        className={
          isClosing
            ? "flex h-full min-h-full min-w-0 flex-col"
            : isClusterFeatured
              ? "flex h-full min-h-0 min-w-0 flex-col"
              : isConstellationWide
                ? "flex h-full min-h-0 min-w-0 flex-col"
                : "flex h-full min-h-0 min-w-0 flex-col"
        }
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <span
            className={`font-heading leading-[0.78] font-black tracking-[-0.04em] text-accent ${
              isClusterFeatured
                ? "text-[44px] md:text-[56px]"
                : isClosing
                  ? "text-[30px] md:text-[36px]"
                  : "text-[48px]"
            }`}
          >
            {formatArticleNumber(number)}
          </span>
          <span
            className={`mt-1.5 text-right font-heading text-[11px] font-bold tracking-[0.12em] text-muted uppercase ${isClosing ? "max-w-52" : ""}`}
          >
            {eyebrow}
          </span>
        </div>

        <h3
          className={`font-heading leading-[1.05] font-black tracking-[-0.032em] text-foreground ${
            isClusterFeatured
              ? "text-[27px] md:text-[32px]"
              : isClosing
                ? "max-w-[16ch] text-[30px] md:text-[40px] lg:text-[46px]"
                : isConstellationSecondary || isConstellationWide
                  ? "text-[24px] md:text-[28px]"
                  : hasImage && !isCompact
                    ? "text-[25px] md:text-[30px]"
                    : "text-[29px] md:text-[36px]"
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
                isSequenceFeatured
                  ? "line-clamp-4 flex-1 text-[16px] md:text-[17px]"
                  : isClosing
                    ? "max-w-[54ch] text-[18px] leading-[1.45] md:text-[20px]"
                    : isConstellationSecondary || isConstellationWide
                      ? "line-clamp-4 flex-1 text-[15.5px] md:text-[16.5px]"
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

function CoreClusterBlock({
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

  return (
    <section className="scroll-mt-20 px-4 py-9 sm:px-6 lg:px-12 lg:py-12">
      <BlockSectionIntro block={block} />
      <div className="grid items-stretch border-l border-t border-foreground md:grid-cols-[minmax(260px,0.42fr)_minmax(0,0.58fr)]">
        {featured ? (
          <div className="relative h-full min-h-full">
            <DossierArticleCard
              article={featured}
              eyebrow={articleEyebrow(featured)}
              number={getArticleNumber(articleNumbers, featured)}
              variant="clusterFeatured"
              className="lg:absolute lg:inset-0"
            />
          </div>
        ) : null}
        <div className="grid h-full min-h-full lg:grid-cols-2">
          {secondary.map((article, index) => {
            const spansTwoColumns = secondary.length % 2 === 1 && index === secondary.length - 1;

            return (
              <DossierArticleCard
                key={article.id}
                article={article}
                eyebrow={articleEyebrow(article)}
                number={getArticleNumber(articleNumbers, article)}
                variant={spansTwoColumns ? "constellationWide" : "constellationSecondary"}
                className={spansTwoColumns ? "lg:col-span-2" : undefined}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BlockSectionIntro({ block }: { block: NarrativeHomeBlock }) {
  if (!block.title && !block.description) {
    return null;
  }

  return (
    <div className="pb-6">
      {block.title ? (
        <h2 className="font-heading text-[clamp(34px,4vw,64px)] leading-[0.9] font-black tracking-[-0.045em] text-foreground uppercase">
          <BlockTitle block={block} />
        </h2>
      ) : null}
      {block.title ? (
        <div className="mt-7.5 border-t border-foreground pt-5.5">
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

  return (
    <section className="scroll-mt-20 px-4 py-8 sm:px-6 lg:px-12 lg:py-10">
      <div className="grid border border-foreground lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {article.imageUrl ? (
          <div className="relative min-h-76 border-b border-foreground grayscale lg:min-h-full lg:border-r lg:border-b-0">
            <Image
              src={article.imageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
        <article className="px-6 py-7 md:px-9 md:py-9">
          <div className="mb-8 flex items-start justify-between gap-4">
            <span className="font-heading text-[56px] leading-[0.78] font-black tracking-[-0.04em] text-accent">
              {formatArticleNumber(getArticleNumber(articleNumbers, article))}
            </span>
            {blockEyebrow(block, article) ? (
              <span className="mt-1.5 max-w-40 text-right font-heading text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                {blockEyebrow(block, article)}
              </span>
            ) : null}
          </div>
          <h2 className="max-w-[14ch] font-heading text-[clamp(38px,5vw,76px)] leading-[0.9] font-black tracking-tighter text-foreground text-balance">
            <StyledTitle title={article.title} titleStyled={article.titleStyled} />
          </h2>
          {article.excerpt ? (
            <p className="mt-6 max-w-[54ch] font-editorial text-[19px] leading-normal text-body-text md:text-[22px]">
              {article.excerpt}
            </p>
          ) : null}
          {block.description ? (
            <p className="mt-5 max-w-[48ch] font-editorial text-[17px] leading-normal text-muted">
              {block.description}
            </p>
          ) : null}
          <div className="mt-8">
            <ArticleMeta article={article} />
          </div>
        </article>
      </div>
    </section>
  );
}

function SequenceBlock({
  block,
  articleNumbers,
}: {
  block: NarrativeHomeBlock;
  articleNumbers: Map<string, number>;
}) {
  const featured = block.featuredArticle ?? block.articles[0] ?? null;
  const articles = featured
    ? [
        featured,
        ...sortUnpaginatedArticles(block.articles.filter((article) => article.id !== featured.id)),
      ]
    : sortUnpaginatedArticles(block.articles);

  if (articles.length === 0) {
    return null;
  }

  return (
    <section className="scroll-mt-20 bg-[#f2eadc] px-4 py-9 sm:px-6 lg:px-12 lg:py-12">
      <BlockSectionIntro block={block} />
      <div className="grid border-l border-t border-foreground md:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <DossierArticleCard
            key={article.id}
            article={article}
            eyebrow={formatTags(article) || article.categoryName || ""}
            number={getArticleNumber(articleNumbers, article)}
            variant={article.id === featured?.id ? "sequenceFeatured" : undefined}
            className={article.id === featured?.id ? "md:col-span-2 xl:col-span-2" : undefined}
          />
        ))}
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

  const variantClasses = getClosingVariantClasses(block.variant);

  return (
    <section
      className={`scroll-mt-20 px-4 py-9 sm:px-6 lg:px-12 lg:py-14 ${variantClasses.section}`}
    >
      <div
        className={`grid gap-0 border lg:grid-cols-[minmax(280px,0.42fr)_minmax(0,0.58fr)] lg:items-stretch ${variantClasses.shell}`}
      >
        {block.title || block.description ? (
          <div
            className={`flex min-h-full flex-col px-6 py-7 md:px-8 md:py-9 lg:border-r ${variantClasses.panel}`}
          >
            {block.title ? (
              <h2
                className={`max-w-[12ch] font-heading text-[clamp(34px,4.4vw,62px)] leading-[0.9] font-black tracking-[-0.045em] uppercase ${variantClasses.title}`}
              >
                <BlockTitle block={block} primaryClassName={variantClasses.titleAccent} />
              </h2>
            ) : null}
            {block.title ? (
              <div className={`mt-7 border-t pt-5 ${variantClasses.divider}`}>
                {block.description ? (
                  <p
                    className={`max-w-[38ch] font-editorial text-[17px] leading-[1.45] md:text-[19px] ${variantClasses.description}`}
                  >
                    {block.description}
                  </p>
                ) : null}
              </div>
            ) : block.description ? (
              <p
                className={`max-w-[38ch] font-editorial text-[19px] leading-[1.45] md:text-[21px] ${variantClasses.description}`}
              >
                {block.description}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className={block.title || block.description ? "" : "lg:col-span-2"}>
          <DossierArticleCard
            article={article}
            eyebrow={blockEyebrow(block, article)}
            number={getArticleNumber(articleNumbers, article)}
            variant="closing"
            className="border-0"
          />
        </div>
      </div>
    </section>
  );
}

function getClosingVariantClasses(variant: NarrativeHomeBlock["variant"]) {
  switch (variant) {
    case "red":
      return {
        section: "bg-background",
        shell: "border-accent",
        panel: "border-accent bg-accent text-background",
        title: "text-foreground",
        titleAccent: "text-background",
        divider: "border-[rgba(17,17,17,0.26)]",
        description: "text-[#f4ebdd]",
      };
    case "default":
      return {
        section: "bg-background",
        shell: "border-foreground",
        panel: "border-foreground bg-background text-foreground",
        title: "text-foreground",
        titleAccent: "text-accent",
        divider: "border-foreground",
        description: "text-body-text",
      };
    case "black":
      return {
        section: "bg-background",
        shell: "border-foreground",
        panel: "border-foreground bg-foreground text-background",
        title: "text-background",
        titleAccent: "text-accent",
        divider: "border-[rgba(244,235,221,0.28)]",
        description: "text-[#f4ebdd]",
      };
  }
}

function getArticleNumbers(blocks: NarrativeHomeBlock[]) {
  const numbers = new Map<string, number>();

  assignArticleNumbers(
    numbers,
    blocks.flatMap((block) => block.articles),
  );

  return numbers;
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
    <section id={id} className="scroll-mt-20 px-4 py-8 sm:px-6 lg:px-12 lg:py-10">
      <div className="grid border-l border-t border-foreground md:grid-cols-2 xl:grid-cols-3">
        {orderedArticles.map((article, index) => (
          <DossierArticleCard
            key={article.id}
            article={article}
            eyebrow={formatTags(article) || article.categoryName || ""}
            number={startNumber + index}
          />
        ))}
      </div>
    </section>
  );
}

function renderBlock(block: NarrativeHomeBlock, articleNumbers: Map<string, number>) {
  switch (block.type) {
    case "opening":
      return <LeadBlock key={block.id} block={block} />;
    case "constellation":
      return <CoreClusterBlock key={block.id} block={block} articleNumbers={articleNumbers} />;
    case "rupture":
      return <FeatureBreakBlock key={block.id} block={block} articleNumbers={articleNumbers} />;
    case "sequence":
      return <SequenceBlock key={block.id} block={block} articleNumbers={articleNumbers} />;
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
