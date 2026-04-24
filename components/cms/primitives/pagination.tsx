"use client";

import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const cellBase =
  "inline-flex items-center justify-center rounded-none font-ui text-[11px] tracking-[0.04em] uppercase py-2 transition-none";

type CmsPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  className?: string;
  labels?: { prev?: string; next?: string };
};

function buildWindow(current: number, total: number): Array<number | "..."> {
  if (total <= 7) return Array.from({ length: total }, (_, idx) => idx + 1);
  const around = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...around].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);

  const result: Array<number | "..."> = [];
  sorted.forEach((n, idx) => {
    if (idx > 0 && n - (sorted[idx - 1] ?? n) > 1) result.push("...");
    result.push(n);
  });
  return result;
}

export function CmsPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  labels,
}: CmsPaginationProps) {
  const text = i18n.cms;
  const items = buildWindow(currentPage, Math.max(1, totalPages));
  const prevLabel = labels?.prev ?? text.pagination.prev;
  const nextLabel = labels?.next ?? text.pagination.next;
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <nav
      aria-label={text.common.paginationAria}
      className={cn("flex flex-wrap items-center", className)}
    >
      <button
        type="button"
        disabled={prevDisabled}
        onClick={() => onPageChange?.(currentPage - 1)}
        className={cn(
          cellBase,
          "border px-3.5",
          prevDisabled
            ? "cursor-not-allowed border-border text-border"
            : "border-foreground text-foreground hover:bg-card-hover",
        )}
      >
        {prevLabel}
      </button>

      {items.map((item, idx) => {
        if (item === "...") {
          return (
            <span
              key={`ellipsis-${idx}`}
              className={cn(cellBase, "border border-l-0 border-border px-3 text-muted-foreground")}
            >
              …
            </span>
          );
        }
        const active = item === currentPage;
        return (
          <button
            key={item}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onPageChange?.(item)}
            className={cn(
              cellBase,
              "border border-l-0 px-3",
              active
                ? "border-accent bg-accent text-white"
                : "border-foreground text-foreground hover:bg-card-hover",
            )}
          >
            {String(item).padStart(2, "0")}
          </button>
        );
      })}

      <button
        type="button"
        disabled={nextDisabled}
        onClick={() => onPageChange?.(currentPage + 1)}
        className={cn(
          cellBase,
          "border border-l-0 px-3.5",
          nextDisabled
            ? "cursor-not-allowed border-border text-border"
            : "border-foreground text-foreground hover:bg-card-hover",
        )}
      >
        {nextLabel}
      </button>
    </nav>
  );
}

type CmsStepperProps = {
  steps: Array<{ label: string }>;
  currentIndex: number;
  className?: string;
};

export function CmsStepper({ steps, currentIndex, className }: CmsStepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-0">
        {steps.map((_, idx) => {
          const past = idx < currentIndex;
          const current = idx === currentIndex;
          const connectorLeft =
            idx === 0 ? null : past || current ? (
              <div key={`c-${idx}`} className="h-0.75 flex-1 bg-accent" />
            ) : (
              <div key={`c-${idx}`} className="h-px flex-1 bg-border" />
            );

          const dotClass = past
            ? "bg-accent border-2 border-accent"
            : current
              ? "bg-white border-2 border-accent"
              : "bg-white border-2 border-border";

          return (
            <div key={idx} className="flex flex-1 items-center last:flex-none">
              {connectorLeft}
              <div className={cn("size-3 shrink-0 rounded-none", dotClass)} />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between font-ui text-[9px] uppercase tracking-[0.05em] text-muted-foreground">
        {steps.map((step, idx) => (
          <span key={`label-${idx}`} className={idx === currentIndex ? "text-accent" : undefined}>
            {step.label}
            {idx === currentIndex ? " ←" : null}
          </span>
        ))}
      </div>
    </div>
  );
}
