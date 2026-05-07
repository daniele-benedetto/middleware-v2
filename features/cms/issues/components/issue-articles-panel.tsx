"use client";

import { CmsArticleListPanel } from "@/components/cms/common/article-list-panel";
import { i18n } from "@/lib/i18n";

export type IssueArticleRow = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
};

type IssueArticlesPanelProps = {
  articles: IssueArticleRow[];
  disabled?: boolean;
  className?: string;
  onReorder: (orderedIds: string[]) => void | Promise<void>;
};

export function IssueArticlesPanel({
  articles,
  disabled,
  className,
  onReorder,
}: IssueArticlesPanelProps) {
  const listText = i18n.cms.lists.issues;

  return (
    <CmsArticleListPanel
      title={listText.articlesPanelTitle}
      emptyText={listText.articlesPanelEmpty}
      featuredAriaLabel={listText.articlesPanelFeaturedAria}
      articles={articles}
      disabled={disabled}
      className={className}
      onReorder={onReorder}
      dndContextId="cms-issue-articles-panel-dnd"
    />
  );
}
