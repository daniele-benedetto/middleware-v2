import { CmsSurface } from "@/components/cms/primitives/surface";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type CmsDataTableShellProps = {
  toolbar: ReactNode;
  table: ReactNode;
  pagination: ReactNode;
  className?: string;
};

export function CmsDataTableShell({
  toolbar,
  table,
  pagination,
  className,
}: CmsDataTableShellProps) {
  return (
    <CmsSurface spacing="none" className={cn("divide-y divide-foreground", className)}>
      <div className="px-[20px] py-[16px]">{toolbar}</div>
      <div className="overflow-x-auto">{table}</div>
      <div className="px-[20px] py-[12px]">{pagination}</div>
    </CmsSurface>
  );
}

/**
 * Canonical class helpers for shadcn Table usage inside CmsDataTableShell.
 * Apply to keep parity with SG table spec (header mono eyebrow, body rows with
 * 1px ink separators, hover bg crema-dk).
 */
export const cmsTableClasses = {
  headerRow: "border-b-[1px] border-foreground hover:bg-transparent",
  headerCell:
    "h-auto px-[20px] py-[10px] font-ui text-[11px] uppercase tracking-[0.08em] text-foreground",
  bodyRow:
    "border-b border-[color:var(--ink-30)] last:border-b-0 hover:bg-[color:var(--bg-hover)] data-[state=selected]:bg-[color:var(--bg-hover)]",
  bodyCell: "px-[20px] py-[14px] font-editorial text-[16px] leading-[var(--lh-md)] text-foreground",
  bodyCellMeta: "px-[20px] py-[14px] font-ui text-[11px] text-[color:var(--ink-60)]",
} as const;
