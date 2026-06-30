"use client";

import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  CmsEmptyState,
  CmsErrorState,
  CmsLoadingState,
  CmsPaginationFooter,
} from "@/components/cms/common";
import {
  CmsBadge,
  CmsDataTableShell,
  CmsPageHeader,
  CmsSelect,
  cmsTableClasses,
} from "@/components/cms/primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CmsListFiltersSheet } from "@/features/cms/shared/components/cms-list-filters-sheet";
import { CmsListSearchInput } from "@/features/cms/shared/components/cms-list-search-input";
import { cmsListQueryOptions, useCmsListUrlState } from "@/features/cms/shared/hooks";
import { parseTelemetryErrorsListSearchParams } from "@/lib/cms/query";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { TelemetryErrorsListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";
import type { ReactNode } from "react";

type TelemetryErrorsListInput = RouterInputs["telemetry"]["errorsList"];
type TelemetryErrorDetail = RouterOutputs["telemetry"]["errorDetail"];

type CmsErrorsScreenProps = {
  initialInput?: TelemetryErrorsListInput;
  initialData?: TelemetryErrorsListInitialData;
};

type ErrorsToolbarFiltersState = {
  sourceValue: string;
};

const defaultErrorsToolbarFilters: ErrorsToolbarFiltersState = {
  sourceValue: "all",
};

function isSameInput(left: TelemetryErrorsListInput | undefined, right: TelemetryErrorsListInput) {
  return Boolean(left && JSON.stringify(left) === JSON.stringify(right));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("it-IT", {
        dateStyle: "short",
        timeStyle: "medium",
      });
}

function formatMetadata(value: unknown) {
  if (value == null) {
    return null;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function resolveSourceLabel(source: string) {
  const text = i18n.cms.lists.errors;

  if (source === "server") {
    return text.sourceServer;
  }

  if (source === "boundary") {
    return text.sourceBoundary;
  }

  return text.sourceClient;
}

function buildErrorsToolbarFiltersState(
  input: TelemetryErrorsListInput,
): ErrorsToolbarFiltersState {
  return {
    sourceValue: input.query?.source ?? defaultErrorsToolbarFilters.sourceValue,
  };
}

function ErrorsToolbarField({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const optionsText = i18n.cms.listOptions;

  return (
    <CmsSelect
      value={value}
      onValueChange={onValueChange}
      options={[
        { value: "all", label: optionsText.sourceAll },
        { value: "server", label: optionsText.sourceServer },
        { value: "client", label: optionsText.sourceClient },
        { value: "boundary", label: optionsText.sourceBoundary },
      ]}
    />
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t-2 border-foreground pt-5 first:border-t-0 first:pt-0">
      <div className="font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </div>
      {children}
    </section>
  );
}

function DetailRows({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <dl className="space-y-2.5">
      {fields.map((field) => (
        <div key={`${field.label}-${field.value}`} className="text-[15px] leading-normal">
          <dt className="inline font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {field.label}: {field.value}
          </dt>
        </div>
      ))}
    </dl>
  );
}

function DetailRowsSkeleton() {
  return (
    <div className="space-y-2.5">
      {["w-40", "w-64", "w-52", "w-72"].map((width) => (
        <Skeleton key={width} className={cn("h-3 rounded-[6px] bg-card-hover", width)} />
      ))}
    </div>
  );
}

function ErrorDetailContent({ detail }: { detail: TelemetryErrorDetail }) {
  const text = i18n.cms.lists.errors;
  const metadata = formatMetadata(detail.metadata);

  return (
    <div className="space-y-6">
      <DetailSection title={text.sections.error}>
        <DetailRows
          fields={[
            { label: text.fields.errorId, value: detail.id },
            { label: text.fields.source, value: resolveSourceLabel(detail.source) },
            { label: text.fields.name, value: detail.name ?? "-" },
            { label: text.fields.message, value: detail.message },
            { label: text.fields.fingerprint, value: detail.fingerprint },
            { label: text.fields.digest, value: detail.digest ?? "-" },
            { label: text.fields.count, value: String(detail.count) },
            { label: text.fields.firstSeenAt, value: formatDateTime(detail.firstSeenAt) },
            { label: text.fields.lastSeenAt, value: formatDateTime(detail.lastSeenAt) },
          ]}
        />
      </DetailSection>

      <DetailSection title={text.sections.request}>
        <DetailRows
          fields={[
            { label: text.fields.path, value: detail.path ?? "-" },
            { label: text.fields.routePath, value: detail.routePath ?? "-" },
            { label: text.fields.routeType, value: detail.routeType ?? "-" },
            { label: text.fields.method, value: detail.method ?? "-" },
            { label: text.fields.requestId, value: detail.requestId ?? "-" },
            { label: text.fields.userAgent, value: detail.userAgent ?? "-" },
          ]}
        />
      </DetailSection>

      <DetailSection title={text.sections.metadata}>
        {metadata ? (
          <pre className="overflow-x-auto border-y border-(--line-section) py-3 font-mono text-[12px] leading-relaxed text-foreground">
            {metadata}
          </pre>
        ) : (
          <div className="text-sm text-muted-foreground">{text.metadataEmpty}</div>
        )}
      </DetailSection>
    </div>
  );
}

function ErrorDetailDialog({ errorId }: { errorId: string }) {
  const [open, setOpen] = useState(false);
  const text = i18n.cms.lists.errors;
  const detailQuery = trpc.telemetry.errorDetail.useQuery(
    { id: errorId },
    {
      enabled: open,
      staleTime: 30_000,
    },
  );

  const detailTitle = text.detailTitle;
  const detailDescription = detailQuery.data
    ? text.detailDescription(formatDateTime(detailQuery.data.lastSeenAt))
    : text.detailDescriptionPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-panel)]",
          "border border-foreground bg-transparent px-3 py-1.5 font-ui text-[12px] font-bold text-foreground",
          "transition-all hover:bg-card-hover focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2",
        )}
      >
        {text.detailsCta}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-2 border-foreground bg-card p-0 text-foreground shadow-none sm:max-w-3xl">
        <div className="border-b-2 border-foreground p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <DialogTitle className="font-display text-3xl leading-none">
                {detailTitle}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {detailDescription}
              </DialogDescription>
            </div>
            <DialogClose
              aria-label={i18n.cms.common.close}
              className={cn(
                "inline-flex size-8 cursor-pointer items-center justify-center rounded-[var(--radius-panel)]",
                "border border-foreground bg-transparent text-foreground transition-all hover:bg-card-hover",
                "focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2",
              )}
            >
              <X className="size-4" aria-hidden />
            </DialogClose>
          </div>
        </div>

        <div className="p-5">
          {detailQuery.isPending && open ? (
            <div className="space-y-6">
              <DetailSection title={text.sections.error}>
                <DetailRowsSkeleton />
              </DetailSection>
              <DetailSection title={text.sections.request}>
                <DetailRowsSkeleton />
              </DetailSection>
            </div>
          ) : detailQuery.isError ? (
            <CmsErrorState
              title={mapTrpcErrorToCmsUiMessage(detailQuery.error).title}
              description={mapTrpcErrorToCmsUiMessage(detailQuery.error).description}
              onRetry={() => void detailQuery.refetch()}
            />
          ) : detailQuery.data ? (
            <ErrorDetailContent detail={detailQuery.data} />
          ) : (
            <div className="text-sm text-muted-foreground">{text.detailLoading}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CmsErrorsScreen({ initialInput, initialData }: CmsErrorsScreenProps) {
  const searchParams = useSearchParams();
  const text = i18n.cms;
  const listText = text.lists.errors;
  const commonText = text.common;

  const input = parseTelemetryErrorsListSearchParams(searchParams);
  const currentToolbarFilters = buildErrorsToolbarFiltersState(input);
  const [draftToolbarFilters, setDraftToolbarFilters] = useState(currentToolbarFilters);

  const query = trpc.telemetry.errorsList.useQuery(input, {
    ...cmsListQueryOptions,
    initialData: isSameInput(initialInput, input) ? initialData : undefined,
  });

  const { updateSearchParams } = useCmsListUrlState({
    baseParams: {
      page: input.page,
      pageSize: input.pageSize,
      q: input.query?.q,
      source: input.query?.source,
      sortBy: input.query?.sortBy,
      sortOrder: input.query?.sortOrder,
    },
  });

  if (query.isPending) {
    return <CmsLoadingState />;
  }

  if (query.isError) {
    const uiError = mapTrpcErrorToCmsUiMessage(query.error);
    return (
      <CmsErrorState
        title={uiError.title}
        description={uiError.description}
        onRetry={uiError.retryable ? () => void query.refetch() : undefined}
      />
    );
  }

  const hasActiveFilters = Boolean(input.query?.q || input.query?.source);
  const activeFiltersCount = Number(
    currentToolbarFilters.sourceValue !== defaultErrorsToolbarFilters.sourceValue,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader title={text.navigation.errors} />
      <p className="mb-4 font-editorial text-sm text-muted-foreground">{listText.subtitle}</p>

      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
            <div className={cmsMetaLabelClass}>
              {commonText.totalRecords(query.data.pagination.total)}
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <CmsListSearchInput
                initialValue={input.query?.q ?? ""}
                placeholder={listText.searchPlaceholder}
                onSearchChange={(value) => {
                  updateSearchParams({ q: value, page: 1 });
                }}
              />

              <CmsListFiltersSheet
                activeFiltersCount={activeFiltersCount}
                className="md:w-36"
                onOpenChange={(open) => {
                  if (open) {
                    setDraftToolbarFilters(currentToolbarFilters);
                  }
                }}
                onApply={() => {
                  updateSearchParams({
                    source:
                      draftToolbarFilters.sourceValue === "all"
                        ? undefined
                        : draftToolbarFilters.sourceValue,
                    page: 1,
                  });
                }}
                onClear={() => {
                  setDraftToolbarFilters(defaultErrorsToolbarFilters);
                }}
              >
                <ErrorsToolbarField
                  value={draftToolbarFilters.sourceValue}
                  onValueChange={(value) => {
                    setDraftToolbarFilters({ sourceValue: value });
                  }}
                />
              </CmsListFiltersSheet>
            </div>
          </div>
        }
        table={
          query.data.items.length > 0 ? (
            <Table
              className={cmsTableClasses.table}
              containerClassName={cmsTableClasses.tableContainer}
            >
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.lastSeenAt}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.source}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.message}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.path}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.count}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.details}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {query.data.items.map((entry) => (
                  <TableRow key={entry.id} className={cmsTableClasses.bodyRow}>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDateTime(entry.lastSeenAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellBadge}>
                      <CmsBadge
                        variant={
                          entry.source === "server" ? "category-solid-accent" : "category-solid-ink"
                        }
                      >
                        {resolveSourceLabel(entry.source)}
                      </CmsBadge>
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <div className="max-w-md truncate text-foreground">{entry.message}</div>
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {entry.path ?? entry.routePath ?? "-"}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{entry.count}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <ErrorDetailDialog errorId={entry.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-4">
              <CmsEmptyState
                title={text.resource.emptyTitle(text.navigation.errors)}
                description={listText.emptyDescription}
                descriptionFiltered={text.resource.emptyDescriptionFiltered}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          )
        }
        pagination={
          <CmsPaginationFooter
            currentPage={query.data.pagination.page}
            totalPages={Math.max(
              1,
              Math.ceil(query.data.pagination.total / query.data.pagination.pageSize),
            )}
            pageSize={query.data.pagination.pageSize}
            onPageChange={(page) => {
              updateSearchParams({ page });
            }}
            onPageSizeChange={(pageSize) => {
              updateSearchParams({ pageSize, page: 1 });
            }}
          />
        }
      />
    </div>
  );
}
