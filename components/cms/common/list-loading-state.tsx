import { cmsTableClasses } from "@/components/cms/primitives/data-table-shell";
import { CmsSectionDivider } from "@/components/cms/primitives/section-divider";
import { CmsSurface } from "@/components/cms/primitives/surface";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type CmsListLoadingStateProps = {
  columns?: number;
  filterColumns?: number;
  secondaryFilterColumns?: number;
  rows?: number;
  hiddenButton?: boolean;
  hiddenCheckbox?: boolean;
};

export function CmsListLoadingState({
  columns = 7,
  rows = 20,
  hiddenButton = false,
}: CmsListLoadingStateProps) {
  const contentColumns = Math.max(0, columns - 1);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-6 pb-4">
        <div className="flex items-start justify-between gap-4 max-sm:flex-col">
          <Skeleton className="h-10.5 w-56 rounded-[8px] border border-border bg-card-hover md:h-10.5 lg:h-13" />
          {!hiddenButton && (
            <Skeleton className="h-12 w-28 rounded-[6px] border border-border bg-card-hover" />
          )}
        </div>
        <CmsSectionDivider tone="strong" className="mt-4" />
      </div>

      <CmsSurface
        spacing="none"
        className="flex min-h-0 flex-1 flex-col divide-y divide-foreground"
      >
        <div className="shrink-0 space-y-3 px-5 py-4">
          <Skeleton className="h-3.5 w-32 rounded-[6px] bg-card-hover" />

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Skeleton className="h-10 rounded-[6px] border border-border bg-card-hover" />
            <Skeleton className="h-10 rounded-[6px] border border-border bg-card-hover md:w-36" />
          </div>
        </div>

        <div className="cms-scroll min-h-0 flex-1 overflow-auto">
          <Table
            className={cmsTableClasses.table}
            containerClassName={cmsTableClasses.tableContainer}
          >
            <TableHeader>
              <TableRow className={cmsTableClasses.headerRow}>
                {!hiddenButton && (
                  <TableHead
                    className={cn(cmsTableClasses.headerCell, cmsTableClasses.selectionCell)}
                  >
                    <div className={cmsTableClasses.selectionCellInner}>
                      <Skeleton className="size-4 rounded-[5px] bg-(--surface-skeleton-on-dark-strong)" />
                    </div>
                  </TableHead>
                )}
                {Array.from({ length: contentColumns }).map((_, index) => (
                  <TableHead key={`head-${index}`} className={cmsTableClasses.headerCell}>
                    <Skeleton className="h-3.5 w-20 rounded-[6px] bg-(--surface-skeleton-on-dark)" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <TableRow key={`row-${rowIndex}`} className={cmsTableClasses.bodyRow}>
                  {!hiddenButton && (
                    <TableCell
                      className={cn(cmsTableClasses.bodyCellMeta, cmsTableClasses.selectionCell)}
                    >
                      <div className={cmsTableClasses.selectionCellInner}>
                        <Skeleton className="size-4 rounded-[5px] border border-border bg-(--surface-skeleton-muted)" />
                      </div>
                    </TableCell>
                  )}
                  {Array.from({ length: contentColumns }).map((_, cellIndex) => (
                    <TableCell
                      key={`cell-${rowIndex}-${cellIndex}`}
                      className={cn(
                        cellIndex === 0
                          ? cmsTableClasses.bodyCellTitle
                          : cmsTableClasses.bodyCellMeta,
                        "py-3.5",
                      )}
                    >
                      <Skeleton
                        className={
                          cellIndex === 0
                            ? "h-5 w-40 rounded-[6px] bg-(--surface-skeleton-muted)"
                            : "h-4 w-20 rounded-[6px] bg-(--surface-skeleton-muted)"
                        }
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-3 max-sm:flex-col max-sm:items-stretch">
          <div className="flex flex-wrap items-center gap-1">
            <Skeleton className="h-8 w-24 rounded-[6px] border border-border bg-card-hover" />
            <Skeleton className="h-8 w-9 rounded-[6px] border border-border bg-card-hover" />
            <Skeleton className="h-8 w-9 rounded-[6px] border border-border bg-card-hover" />
            <Skeleton className="h-8 w-9 rounded-[6px] border border-border bg-card-hover" />
            <Skeleton className="h-8 w-24 rounded-[6px] border border-border bg-card-hover" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-3.5 w-18 rounded-[6px] bg-card-hover" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-9 rounded-[6px] border border-border bg-card-hover" />
              <Skeleton className="h-7 w-9 rounded-[6px] border border-border bg-card-hover" />
              <Skeleton className="h-7 w-9 rounded-[6px] border border-border bg-card-hover" />
            </div>
          </div>
        </div>
      </CmsSurface>
    </div>
  );
}
