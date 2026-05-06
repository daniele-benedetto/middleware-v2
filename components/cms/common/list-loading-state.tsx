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
  filterColumns = 3,
  secondaryFilterColumns = 0,
  rows = 20,
  hiddenButton = false,
}: CmsListLoadingStateProps) {
  const filterGridStyle = { gridTemplateColumns: `repeat(${filterColumns}, minmax(0, 1fr))` };
  const secondaryFilterGridStyle =
    secondaryFilterColumns > 0
      ? { gridTemplateColumns: `repeat(${secondaryFilterColumns}, minmax(0, 1fr))` }
      : undefined;

  const contentColumns = Math.max(0, columns - 1);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-6 pb-4">
        <div className="flex items-start justify-between gap-4 max-sm:flex-col">
          <Skeleton className="lg:h-12.5 md:h-10 h-10 w-56 rounded-none border border-border bg-card-hover" />
          {!hiddenButton && (
            <Skeleton className="h-10 w-20 rounded-none border border-border bg-card-hover" />
          )}
        </div>
        <CmsSectionDivider tone="strong" className="mt-4" />
      </div>

      <CmsSurface
        spacing="none"
        className="flex min-h-0 flex-1 flex-col divide-y divide-foreground"
      >
        <div className="shrink-0 space-y-3 px-5 py-4">
          <Skeleton className="h-3.5 w-32 rounded-none bg-card-hover" />

          <div className="grid gap-3 lg:grid-cols-3">
            <Skeleton className="col-span-1 h-10 rounded-none border border-border bg-card-hover lg:col-span-1" />
            <div className="col-span-1 grid gap-2 lg:col-span-2" style={filterGridStyle}>
              {Array.from({ length: filterColumns }).map((_, index) => (
                <Skeleton
                  key={`filter-${index}`}
                  className="h-10 rounded-none border border-border bg-card-hover"
                />
              ))}
            </div>
          </div>

          {secondaryFilterGridStyle ? (
            <div className="grid gap-3" style={secondaryFilterGridStyle}>
              {Array.from({ length: secondaryFilterColumns }).map((_, index) => (
                <Skeleton
                  key={`filter2-${index}`}
                  className="h-10 rounded-none border border-border bg-card-hover"
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="cms-scroll min-h-0 flex-1 overflow-auto">
          <Table className={cmsTableClasses.table}>
            <TableHeader>
              <TableRow className={cmsTableClasses.headerRow}>
                {!hiddenButton && (
                  <TableHead className={cn(cmsTableClasses.headerCell, "w-10 px-2")}>
                    <Skeleton className="size-4 rounded-none bg-[rgba(240,232,216,0.35)]" />
                  </TableHead>
                )}
                {Array.from({ length: contentColumns }).map((_, index) => (
                  <TableHead key={`head-${index}`} className={cmsTableClasses.headerCell}>
                    <Skeleton className="h-3.5 w-20 rounded-none bg-[rgba(240,232,216,0.25)]" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <TableRow key={`row-${rowIndex}`} className={cmsTableClasses.bodyRow}>
                  {!hiddenButton && (
                    <TableCell className={cn(cmsTableClasses.bodyCellMeta, "w-10 px-2 py-3.5")}>
                      <Skeleton className="size-4.5 rounded-none border border-border bg-foreground/10" />
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
                            ? "h-5 w-40 rounded-none bg-foreground/10"
                            : "h-4 w-20 rounded-none bg-foreground/10"
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
          <Skeleton className="h-8 w-60 rounded-none border border-border bg-card-hover" />
          <Skeleton className="h-8 w-40 rounded-none border border-border bg-card-hover" />
        </div>
      </CmsSurface>
    </div>
  );
}
