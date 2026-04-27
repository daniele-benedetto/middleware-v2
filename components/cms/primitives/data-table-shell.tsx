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
      <div className="px-5 py-4">{toolbar}</div>
      <div className="overflow-x-auto">{table}</div>
      <div className="px-5 py-3">{pagination}</div>
    </CmsSurface>
  );
}

const headerCellBase =
  "h-auto font-ui font-normal text-[10px] uppercase tracking-[0.08em] text-left align-middle";

const bodyCellBase = "align-middle";

export const cmsTableClasses = {
  table: "w-full border-collapse",

  headerRow:
    "bg-foreground border-b-[2px] border-foreground hover:bg-foreground data-[state=selected]:bg-foreground",
  headerCell: cn(
    headerCellBase,
    "px-3.5 py-2.5 text-(--bg-main) border-r border-[color:rgba(240,232,216,0.15)] last:border-r-0",
  ),

  sortableHeaderRow:
    "bg-card-hover border-b-[2px] border-foreground hover:bg-card-hover data-[state=selected]:bg-card-hover",
  sortableHeaderCell: cn(
    headerCellBase,
    "px-3.5 py-2.25 text-muted-foreground border-r border-foreground last:border-r-0 cursor-pointer select-none",
  ),
  sortableHeaderCellActive: "text-accent",

  bodyRow: cn(
    "border-b border-foreground last:border-b-0",
    "odd:bg-white even:bg-card-hover",
    "hover:bg-accent [&:hover_td]:text-white! [&:hover_td]:border-r-[color:rgba(255,255,255,0.2)]",
    "data-[state=selected]:bg-card-hover",
  ),
  bodyRowArchived: cn(
    "border-b border-foreground last:border-b-0 bg-card-hover",
    "hover:bg-accent [&:hover_td]:text-white! [&:hover_td]:border-r-[color:rgba(255,255,255,0.2)]",
  ),

  bodyCellTitle: cn(
    bodyCellBase,
    "px-3.5 py-2.75 font-editorial text-[15px] leading-[1.3] text-foreground border-r border-[color:rgba(10,10,10,0.1)] last:border-r-0",
  ),
  bodyCellTitleArchived: cn(
    bodyCellBase,
    "px-3.5 py-2.75 font-editorial text-[15px] leading-[1.3] italic text-border border-r border-[color:rgba(10,10,10,0.1)] last:border-r-0",
  ),
  bodyCellMeta: cn(
    bodyCellBase,
    "px-3.5 py-2.75 font-ui text-[11px] text-muted-foreground border-r border-[color:rgba(10,10,10,0.1)] last:border-r-0",
  ),
  bodyCellMetaArchived: cn(
    bodyCellBase,
    "px-3.5 py-2.75 font-ui text-[11px] text-border border-r border-[color:rgba(10,10,10,0.1)] last:border-r-0",
  ),
  bodyCellNumeric: cn(bodyCellBase, "px-3.5 py-2.5 font-ui text-[11px] text-foreground text-right"),
  bodyCellBadge: cn(
    bodyCellBase,
    "px-3.5 py-2.75 border-r border-[color:rgba(10,10,10,0.1)] last:border-r-0",
  ),
} as const;

export type CmsSortDirection = "asc" | "desc" | null;

type CmsSortIconProps = {
  direction: CmsSortDirection;
  className?: string;
};

export function CmsSortIcon({ direction, className }: CmsSortIconProps) {
  const symbol = direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕";
  const active = direction !== null;
  return (
    <span
      aria-hidden
      className={cn(
        "ml-1.5 inline-block font-ui text-[10px] leading-none",
        active ? "text-accent" : "text-border",
        className,
      )}
    >
      {symbol}
    </span>
  );
}
