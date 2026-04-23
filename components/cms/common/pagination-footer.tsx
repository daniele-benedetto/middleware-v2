"use client";

import { CmsPagination } from "@/components/cms/primitives/pagination";
import { CmsEyebrow } from "@/components/cms/primitives/typography";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type CmsPaginationFooterProps = {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  className?: string;
};

export function CmsPaginationFooter({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 20,
  pageSizeOptions = [10, 20, 50],
  onPageSizeChange,
  className,
}: CmsPaginationFooterProps) {
  const text = i18n.cms.pagination;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch",
        className,
      )}
    >
      <CmsPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />

      <div className="flex items-center gap-2.5">
        <CmsEyebrow>{text.perPage}</CmsEyebrow>
        <div className="flex border border-foreground">
          {pageSizeOptions.map((size) => {
            const active = size === pageSize;
            return (
              <button
                key={size}
                type="button"
                onClick={() => onPageSizeChange?.(size)}
                className={cn(
                  "border-r border-foreground px-2.5 py-1 font-ui text-[11px] uppercase tracking-[0.04em] last:border-r-0",
                  active ? "bg-accent text-white" : "text-foreground hover:bg-card-hover",
                )}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
