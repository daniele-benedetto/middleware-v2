"use client";

import { useState } from "react";

import {
  getHomeGridRows,
  HOME_SECTION_VISIBLE_ARTICLES_LIMIT,
  type HomeIssueArticle,
} from "@/components/public/home/home-view-model";
import { IssueArticleCard } from "@/components/public/home/issue-article-card";
import { i18n } from "@/lib/i18n";

import type { CSSProperties } from "react";

type IssueSectionGridProps = {
  title: string;
  articles: HomeIssueArticle[];
};

export function IssueSectionGrid({ title, articles }: IssueSectionGridProps) {
  const [expanded, setExpanded] = useState(false);
  const text = i18n.public.home.sectionGrid;
  const hasHiddenArticles = articles.length > HOME_SECTION_VISIBLE_ARTICLES_LIMIT;
  const visibleArticles = expanded
    ? articles
    : articles.slice(0, HOME_SECTION_VISIBLE_ARTICLES_LIMIT);
  const rows = getHomeGridRows(visibleArticles);

  return (
    <>
      <div className="border-l border-foreground">
        {rows.map((row, rowIndex) => (
          <div
            key={`${title}-${rowIndex}`}
            className="grid grid-cols-1 md:[grid-template-columns:repeat(var(--home-grid-columns),minmax(0,1fr))]"
            style={{ "--home-grid-columns": row.length } as CSSProperties}
          >
            {row.map((article) => (
              <IssueArticleCard key={article.id} article={article} label={title} />
            ))}
          </div>
        ))}
      </div>
      {hasHiddenArticles ? (
        <div className="border-x border-b border-foreground px-6.5 py-4 md:px-7">
          <button
            type="button"
            className="inline-flex items-center rounded-[8px] bg-foreground px-4 py-2.5 font-heading text-[13px] font-bold tracking-[0.04em] text-background uppercase transition-colors duration-(--motion-fast) hover:bg-accent"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? text.showLess : text.showAll(articles.length)}
          </button>
        </div>
      ) : null}
    </>
  );
}
