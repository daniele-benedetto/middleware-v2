"use client";

import { cn } from "@/lib/utils";

const cellBase =
  "inline-flex items-center justify-center rounded-none font-ui text-[11px] tracking-[0.04em] uppercase py-[8px] transition-none";

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
  const items = buildWindow(currentPage, Math.max(1, totalPages));
  const prevLabel = labels?.prev ?? "← PREC.";
  const nextLabel = labels?.next ?? "SUCC. →";
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <nav aria-label="Paginazione" className={cn("flex flex-wrap items-center", className)}>
      <button
        type="button"
        disabled={prevDisabled}
        onClick={() => onPageChange?.(currentPage - 1)}
        className={cn(
          cellBase,
          "border px-[14px]",
          prevDisabled
            ? "cursor-not-allowed border-[color:var(--ink-30)] text-[color:var(--ink-30)]"
            : "border-foreground text-foreground hover:bg-[color:var(--bg-hover)]",
        )}
      >
        {prevLabel}
      </button>

      {items.map((item, idx) => {
        if (item === "...") {
          return (
            <span
              key={`ellipsis-${idx}`}
              className={cn(
                cellBase,
                "border border-l-0 border-[color:var(--ink-30)] px-[12px] text-[color:var(--ink-60)]",
              )}
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
              "border border-l-0 px-[12px]",
              active
                ? "border-accent bg-accent text-white"
                : "border-foreground text-foreground hover:bg-[color:var(--bg-hover)]",
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
          "border border-l-0 px-[14px]",
          nextDisabled
            ? "cursor-not-allowed border-[color:var(--ink-30)] text-[color:var(--ink-30)]"
            : "border-foreground text-foreground hover:bg-[color:var(--bg-hover)]",
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
              <div key={`c-${idx}`} className="h-[3px] flex-1 bg-accent" />
            ) : (
              <div key={`c-${idx}`} className="h-[1px] flex-1 bg-[color:var(--ink-30)]" />
            );

          const dotClass = past
            ? "bg-accent border-2 border-accent"
            : current
              ? "bg-white border-2 border-accent"
              : "bg-white border-2 border-[color:var(--ink-30)]";

          return (
            <div key={idx} className="flex flex-1 items-center last:flex-none">
              {connectorLeft}
              <div className={cn("size-[12px] shrink-0 rounded-none", dotClass)} />
            </div>
          );
        })}
      </div>
      <div className="mt-[6px] flex justify-between font-ui text-[9px] uppercase tracking-[0.05em] text-[color:var(--ink-60)]">
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
