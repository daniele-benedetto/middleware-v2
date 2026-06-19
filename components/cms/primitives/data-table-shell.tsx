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
    <CmsSurface
      spacing="none"
      className={cn("flex min-h-0 flex-1 flex-col divide-y divide-foreground", className)}
    >
      <div className="shrink-0 px-5 py-4">{toolbar}</div>
      <div className="cms-scroll min-h-0 flex-1 overflow-auto">{table}</div>
      <div className="shrink-0 px-5 py-3">{pagination}</div>
    </CmsSurface>
  );
}

const headerCellBase =
  "h-auto text-left align-middle font-ui text-[10px] font-extrabold uppercase tracking-[var(--tracking-label)]";

const bodyCellBase = "align-middle";

export const cmsTableClasses = {
  tableContainer: "overflow-visible",
  table: "w-full border-collapse",
  headerCheckbox: "bg-white",
  selectionCell: "w-8 min-w-8 max-w-8 px-0 text-center align-middle",
  selectionCellInner: "flex h-full w-full items-center justify-center",
  headerRow:
    "bg-foreground border-b-[2px] border-foreground hover:bg-foreground data-[state=selected]:bg-foreground",
  headerCell: cn(
    headerCellBase,
    "sticky top-0 z-20 border-r border-(color:--line-subtle-on-dark) bg-foreground px-3.5 py-2.5 text-background last:border-r-0",
  ),

  sortableHeaderRow:
    "bg-card-hover border-b-[2px] border-foreground hover:bg-card-hover data-[state=selected]:bg-card-hover",
  sortableHeaderCell: cn(
    headerCellBase,
    "sticky top-0 z-20 border-r border-foreground bg-card-hover px-3.5 py-2.25 text-muted-foreground last:border-r-0 cursor-pointer select-none",
  ),
  sortableHeaderCellActive: "text-accent",

  bodyRow: cn(
    "border-b border-foreground last:border-b-0",
    "odd:bg-white even:bg-card-hover",
    "data-[state=selected]:bg-card-hover",
  ),
  bodyRowArchived: cn("border-b border-foreground last:border-b-0 bg-card-hover"),

  bodyCellTitle: cn(
    bodyCellBase,
    "border-r border-(color:--line-subtle) px-3.5 py-2.75 font-editorial text-[15px] leading-[1.3] text-body-text last:border-r-0",
  ),
  bodyCellTitleArchived: cn(
    bodyCellBase,
    "border-r border-(color:--line-subtle) px-3.5 py-2.75 font-editorial text-[15px] leading-[1.3] italic text-border last:border-r-0",
  ),
  bodyCellMeta: cn(
    bodyCellBase,
    "border-r border-(color:--line-subtle) px-3.5 py-2.75 font-ui text-[11px] font-semibold text-muted-foreground last:border-r-0",
  ),
  bodyCellMetaArchived: cn(
    bodyCellBase,
    "border-r border-(color:--line-subtle) px-3.5 py-2.75 font-ui text-[11px] font-semibold text-border last:border-r-0",
  ),
  bodyCellNumeric: cn(
    bodyCellBase,
    "px-3.5 py-2.5 text-right font-ui text-[11px] font-bold text-foreground",
  ),
  bodyCellBadge: cn(
    bodyCellBase,
    "border-r border-(color:--line-subtle) px-3.5 py-2.75 last:border-r-0",
  ),
  rowActionButton: "gap-1.5 bg-transparent hover:bg-surface-hover [&_svg]:size-3.5",
  rowDeleteActionButton: "gap-1.5 bg-transparent hover:bg-surface-hover [&_svg]:size-3.5",
} as const;
