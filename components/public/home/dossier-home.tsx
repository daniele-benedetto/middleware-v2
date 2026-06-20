import Image from "next/image";

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
  variant?: "standard" | "featured" | "compact" | "closing";
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

function ArticleMeta({
  article,
  tone = "light",
}: {
  article: HomeIssueArticle;
  tone?: "light" | "dark";
}) {
  const text = i18n.public.home.articleCard;
  const muted = tone === "dark" ? "text-dark-muted" : "text-muted";

  return (
    <div
      className={`flex flex-wrap items-center gap-3.5 font-heading text-[12.5px] font-semibold ${muted}`}
    >
      {article.categoryName ? <span>{article.categoryName}</span> : null}
      {article.authorName ? <span>{article.authorName}</span> : null}
      <span className="flex items-center gap-1.75">
        <span className="size-1 rounded-[1px] bg-accent" aria-hidden />
        {text.readingTimeLabel(article.readingTimeMinutes)}
      </span>
      {article.hasAudio ? (
        <span className="flex items-center gap-1.75">
          <span className="size-1 rounded-[1px] bg-accent" aria-hidden />
          {text.audioLabel}
        </span>
      ) : null}
    </div>
  );
}

function LeadBlock({ block }: { block: NarrativeHomeBlock }) {
  const article = block.featuredArticle ?? block.articles[0];

  if (!article) {
    return null;
  }

  const tagLine = formatTags(article);

  return (
    <section id="dossier" className="scroll-mt-20 bg-foreground text-background">
      <div className="px-4 py-13 sm:px-6 lg:px-12 lg:pb-15">
        <div className="mb-7 flex flex-wrap items-center gap-3.5 border-b border-dark-border pb-5.5">
          <span className="inline-flex size-10.5 items-center justify-center rounded-[8px] bg-accent font-heading text-[17px] font-black text-background">
            {String(article.position).padStart(2, "0")}
          </span>
          {block.title ? (
            <span className="font-heading text-[13px] font-extrabold tracking-[0.14em] text-accent uppercase">
              {block.title}
            </span>
          ) : null}
          <ArticleMeta article={article} tone="dark" />
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:gap-12">
          <div>
            {tagLine ? (
              <p className="mb-5 font-heading text-[12px] font-extrabold tracking-[0.16em] text-accent uppercase">
                {tagLine}
              </p>
            ) : null}
            <h2 className="max-w-[13ch] font-heading text-[clamp(42px,6.6vw,104px)] leading-[0.88] font-black tracking-[-0.052em] text-balance">
              <StyledTitle title={article.title} titleStyled={article.titleStyled} />
            </h2>
            {article.excerpt ? (
              <p className="mt-7 max-w-[58ch] font-editorial text-[clamp(19px,1.7vw,25px)] leading-[1.34] text-[#e7ddcb] italic">
                {article.excerpt}
              </p>
            ) : null}
            {block.description ? (
              <p className="mt-5 max-w-[54ch] font-editorial text-[17px] leading-normal text-dark-muted">
                {block.description}
              </p>
            ) : null}
          </div>

          {article.imageUrl ? (
            <div className="relative min-h-95 overflow-hidden border border-dark-border grayscale lg:min-h-130">
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

function DossierArticleCard({ article, eyebrow, variant = "standard" }: DossierArticleCardProps) {
  const hasImage = Boolean(article.imageUrl);
  const isCompact = variant === "compact";
  const isClosing = variant === "closing";

  return (
    <article
      className={`group flex min-h-full flex-col border-foreground bg-background transition-[background,box-shadow] duration-(--motion-fast) hover:bg-surface-hover hover:shadow-[var(--interactive-rail-shadow)] ${
        isClosing
          ? "border px-6 py-6 md:px-8 md:py-7"
          : "border-r border-b px-6 py-6 md:px-7 md:py-7"
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <span className="font-heading text-[48px] leading-[0.78] font-black tracking-[-0.04em] text-accent">
          {String(article.position).padStart(2, "0")}
        </span>
        <span className="mt-1.5 text-right font-heading text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
          {eyebrow}
        </span>
      </div>

      {article.imageUrl && !isCompact ? (
        <div className="relative mb-5 h-45 overflow-hidden border border-foreground grayscale md:h-52">
          <Image
            src={article.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover transition-transform duration-(--motion-slow) group-hover:scale-[1.025]"
          />
        </div>
      ) : null}

      <h3
        className={`font-heading leading-[1.05] font-black tracking-[-0.032em] text-foreground ${
          hasImage && !isCompact ? "text-[25px] md:text-[30px]" : "text-[29px] md:text-[36px]"
        }`}
      >
        <StyledTitle title={article.title} titleStyled={article.titleStyled} />
      </h3>
      {article.excerpt ? (
        <p className="mt-4 font-editorial text-[16px] leading-normal text-body-text md:text-[17px]">
          {article.excerpt}
        </p>
      ) : null}
      <div className="mt-auto pt-6">
        <ArticleMeta article={article} />
      </div>
    </article>
  );
}

function CoreClusterBlock({ block }: { block: NarrativeHomeBlock }) {
  const featured = block.featuredArticle ?? block.articles[0] ?? null;
  const secondary = featured
    ? block.articles.filter((article) => article.id !== featured.id)
    : block.articles;

  return (
    <section className="scroll-mt-20 px-4 py-8 sm:px-6 lg:px-12 lg:py-10">
      {block.title || block.description ? (
        <div className="mb-0 flex flex-wrap items-end justify-between gap-4 border-t border-foreground py-5">
          {block.title ? (
            <p className="font-heading text-[12px] font-extrabold tracking-[0.14em] text-accent uppercase">
              {block.title}
            </p>
          ) : null}
          {block.description ? (
            <p className="max-w-[44ch] font-editorial text-[16px] leading-normal text-body-text">
              {block.description}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="grid border-l border-foreground lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        {featured ? (
          <DossierArticleCard
            article={featured}
            eyebrow={blockEyebrow(block, featured)}
            variant="featured"
          />
        ) : null}
        <div className="grid md:grid-cols-2">
          {secondary.map((article) => (
            <DossierArticleCard
              key={article.id}
              article={article}
              eyebrow={blockEyebrow(block, article)}
              variant="compact"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureBreakBlock({ block }: { block: NarrativeHomeBlock }) {
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
              {String(article.position).padStart(2, "0")}
            </span>
            {blockEyebrow(block, article) ? (
              <span className="mt-1.5 max-w-40 text-right font-heading text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                {blockEyebrow(block, article)}
              </span>
            ) : null}
          </div>
          <h2 className="max-w-[14ch] font-heading text-[clamp(38px,5vw,76px)] leading-[0.9] font-black tracking-[-0.05em] text-foreground text-balance">
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

function SequenceBlock({ block }: { block: NarrativeHomeBlock }) {
  const primary = block.featuredArticle ?? block.articles[0] ?? null;
  const secondary = primary
    ? block.articles.filter((article) => article.id !== primary.id)
    : block.articles;

  if (!primary) {
    return null;
  }

  return (
    <section className="scroll-mt-20 bg-[#f2eadc] px-4 py-9 sm:px-6 lg:px-12 lg:py-12">
      {block.title || block.description ? (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-t border-foreground pt-5">
          <div>
            {block.title ? (
              <p className="font-heading text-[12px] font-extrabold tracking-[0.14em] text-accent uppercase">
                {block.title}
              </p>
            ) : null}
          </div>
          {block.description ? (
            <p className="max-w-[42ch] font-editorial text-[18px] leading-normal text-body-text">
              {block.description}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[0.48fr_0.52fr]">
        <DossierArticleCard article={primary} eyebrow={blockEyebrow(block, primary)} />
        {secondary.length > 0 ? (
          <div className="grid border-l border-t border-foreground md:grid-cols-2">
            {secondary.map((article) => (
              <DossierArticleCard
                key={article.id}
                article={article}
                eyebrow={blockEyebrow(block, article)}
                variant="compact"
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ClosingBlock({ block }: { block: NarrativeHomeBlock }) {
  const article = block.featuredArticle ?? block.articles[0];

  if (!article) {
    return null;
  }

  return (
    <section className="scroll-mt-20 px-4 py-8 sm:px-6 lg:px-12 lg:py-12">
      <div className="grid gap-5 lg:grid-cols-[0.36fr_0.64fr] lg:items-stretch">
        {block.title || block.description ? (
          <div className="border border-foreground bg-foreground px-6 py-6 text-background md:px-8 md:py-7">
            {block.title ? (
              <p className="font-heading text-[12px] font-extrabold tracking-[0.14em] text-accent uppercase">
                {block.title}
              </p>
            ) : null}
            {block.description ? (
              <p className="mt-5 max-w-[22ch] font-heading text-[clamp(28px,3.2vw,52px)] leading-[0.94] font-black tracking-[-0.04em]">
                {block.description}
              </p>
            ) : null}
          </div>
        ) : null}
        <DossierArticleCard
          article={article}
          eyebrow={blockEyebrow(block, article)}
          variant="closing"
        />
      </div>
    </section>
  );
}

function renderBlock(block: NarrativeHomeBlock) {
  switch (block.type) {
    case "opening":
      return <LeadBlock key={block.id} block={block} />;
    case "constellation":
      return <CoreClusterBlock key={block.id} block={block} />;
    case "rupture":
      return <FeatureBreakBlock key={block.id} block={block} />;
    case "sequence":
      return <SequenceBlock key={block.id} block={block} />;
    case "closing":
      return <ClosingBlock key={block.id} block={block} />;
  }
}
export function DossierHome({ issue }: DossierHomeProps) {
  const blocks = composeNarrativeHomeBlocks(issue);

  if (blocks.length === 0) {
    return null;
  }

  return <div className="bg-background">{blocks.map(renderBlock)}</div>;
}
