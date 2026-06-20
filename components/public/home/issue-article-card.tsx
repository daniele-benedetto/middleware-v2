import Image from "next/image";

import { StyledTitle } from "@/components/public/styled-title";
import { i18n } from "@/lib/i18n";

import type { HomeIssueArticle } from "@/components/public/home/home-view-model";

type IssueArticleCardProps = {
  article: HomeIssueArticle;
  variant: "compact" | "prominent";
  label: string;
};

export function IssueArticleCard({ article, variant, label }: IssueArticleCardProps) {
  const text = i18n.public.home.articleCard;

  return (
    <article className="flex flex-col border-r border-b border-foreground px-6.5 py-6.5 transition-[background,box-shadow] duration-(--motion-fast) hover:bg-surface-hover hover:shadow-[var(--interactive-rail-shadow)] md:px-7">
      {variant === "prominent" ? (
        <div className="mb-4 flex items-start justify-between">
          <span className="font-heading text-[52px] leading-[0.78] font-black tracking-[-0.04em] text-accent">
            {String(article.position).padStart(2, "0")}
          </span>
          <span className="mt-1.5 font-heading text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            {label}
          </span>
        </div>
      ) : (
        <div className="mb-3.5 flex items-center gap-2.75">
          <span className="font-heading text-sm font-black text-accent">
            {String(article.position).padStart(2, "0")}
          </span>
          <span className="font-heading text-[11px] font-bold tracking-[0.12em] text-accent uppercase">
            {label}
          </span>
        </div>
      )}

      {article.imageUrl ? (
        <div className="relative mb-4.5 h-37.5 overflow-hidden border border-foreground grayscale">
          <Image
            src={article.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <h3 className="font-heading text-[22px] leading-[1.1] font-bold tracking-[-0.02em] text-foreground md:text-2xl md:leading-[1.08]">
        <StyledTitle title={article.title} titleStyled={article.titleStyled} />
      </h3>
      {article.excerpt ? (
        <p className="mt-3.25 font-editorial text-[15px] leading-normal text-body-text">
          {article.excerpt}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-3.5 pt-5 font-heading text-[12.5px] font-semibold text-muted">
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
    </article>
  );
}
