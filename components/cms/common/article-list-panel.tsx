"use client";

import { ArrowDown, ArrowUp, Star } from "lucide-react";
import Link from "next/link";

import { CmsActionButton, cmsTableClasses } from "@/components/cms/primitives";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type CmsArticleListPanelItem = {
  id: string;
  title: string;
  isFeatured: boolean;
  href?: string;
};

type CmsArticleListPanelProps = {
  title: string;
  emptyText: string;
  featuredAriaLabel: string;
  articles: CmsArticleListPanelItem[];
  className?: string;
  disabled?: boolean;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
};

export function CmsArticleListPanel({
  title,
  emptyText,
  featuredAriaLabel,
  articles,
  className,
  disabled,
  onMoveUp,
  onMoveDown,
}: CmsArticleListPanelProps) {
  const commonText = i18n.cms.common;
  const isReorderable = Boolean(onMoveUp && onMoveDown);

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col border border-foreground bg-white", className)}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-foreground px-3 py-2">
        <span className="font-ui text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
          {title}
        </span>
        <span className="font-ui text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
          {articles.length}
        </span>
      </div>

      {articles.length === 0 ? (
        <div className="px-3 py-4 font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Table className={cmsTableClasses.table}>
            <TableBody>
              {articles.map((article, index) => (
                <TableRow key={article.id} className={cmsTableClasses.bodyRow}>
                  {isReorderable ? (
                    <TableCell className={cn(cmsTableClasses.bodyCellMeta, "w-px px-2 py-2")}>
                      <div className="flex items-center gap-1">
                        <CmsActionButton
                          variant="outline"
                          size="xs"
                          disabled={disabled || index === 0}
                          onClick={() => onMoveUp?.(index)}
                          aria-label={`${commonText.moveUp}: ${article.title}`}
                          title={`${commonText.moveUp}: ${article.title}`}
                        >
                          <ArrowUp className="size-3" />
                        </CmsActionButton>
                        <CmsActionButton
                          variant="outline"
                          size="xs"
                          disabled={disabled || index === articles.length - 1}
                          onClick={() => onMoveDown?.(index)}
                          aria-label={`${commonText.moveDown}: ${article.title}`}
                          title={`${commonText.moveDown}: ${article.title}`}
                        >
                          <ArrowDown className="size-3" />
                        </CmsActionButton>
                      </div>
                    </TableCell>
                  ) : null}
                  <TableCell className={cmsTableClasses.bodyCellTitle}>
                    {article.href ? (
                      <Link href={article.href} className="block truncate hover:text-accent">
                        {article.title}
                      </Link>
                    ) : (
                      <span className="block truncate">{article.title}</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(cmsTableClasses.bodyCellMeta, "w-px px-2 py-2 text-center")}
                  >
                    {article.isFeatured ? (
                      <Star
                        className="inline-block h-3.5 w-3.5 text-accent"
                        aria-label={featuredAriaLabel}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
