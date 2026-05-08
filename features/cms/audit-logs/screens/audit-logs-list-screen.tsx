"use client";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CmsAuditLogDetailDialog } from "@/features/cms/audit-logs/components/audit-log-detail-dialog";
import { CmsListFiltersSheet } from "@/features/cms/shared/components/cms-list-filters-sheet";
import { CmsListSearchInput } from "@/features/cms/shared/components/cms-list-search-input";
import { useAuditLogsListQuery, useCmsListUrlState } from "@/features/cms/shared/hooks";
import { parseAuditLogsListSearchParams } from "@/lib/cms/query";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";

import type { AuditLogsListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type AuditLogsListInput = RouterInputs["auditLogs"]["list"];

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("it-IT", {
        dateStyle: "short",
        timeStyle: "medium",
      });
}

function formatActionLabel(value: string) {
  return value.replace(/-/g, " ").toUpperCase();
}

type CmsAuditLogsListScreenProps = {
  initialInput?: AuditLogsListInput;
  initialData?: AuditLogsListInitialData;
};

type AuditLogsListToolbarFiltersState = {
  outcomeValue: string;
};

const defaultAuditLogsListToolbarFilters: AuditLogsListToolbarFiltersState = {
  outcomeValue: "all",
};

function buildAuditLogsListToolbarFiltersState(
  input: AuditLogsListInput,
): AuditLogsListToolbarFiltersState {
  return {
    outcomeValue: input.query?.outcome ?? defaultAuditLogsListToolbarFilters.outcomeValue,
  };
}

function AuditLogsListToolbarField({
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
        { value: "all", label: optionsText.outcomeAll },
        { value: "SUCCESS", label: optionsText.outcomeSuccessOnly },
        { value: "FAILURE", label: optionsText.outcomeFailureOnly },
      ]}
    />
  );
}

export function CmsAuditLogsListScreen({ initialInput, initialData }: CmsAuditLogsListScreenProps) {
  const searchParams = useSearchParams();
  const text = i18n.cms;
  const listText = text.lists.auditLogs;
  const commonText = text.common;

  const input = parseAuditLogsListSearchParams(searchParams);
  const currentToolbarFilters = buildAuditLogsListToolbarFiltersState(input);
  const [draftToolbarFilters, setDraftToolbarFilters] = useState(currentToolbarFilters);
  const listQuery = useAuditLogsListQuery(input, { initialDataInput: initialInput, initialData });

  const { updateSearchParams } = useCmsListUrlState({
    baseParams: {
      page: input.page,
      pageSize: input.pageSize,
      q: input.query?.q,
      outcome: input.query?.outcome,
    },
  });

  if (listQuery.isPending) {
    return <CmsLoadingState />;
  }

  if (listQuery.isError) {
    const uiError = mapTrpcErrorToCmsUiMessage(listQuery.error);

    return (
      <CmsErrorState
        title={uiError.title}
        description={uiError.description}
        onRetry={uiError.retryable ? listQuery.retry : undefined}
      />
    );
  }

  const hasActiveFilters = Boolean(input.query?.q || input.query?.outcome);
  const activeFiltersCount = Number(
    currentToolbarFilters.outcomeValue !== defaultAuditLogsListToolbarFilters.outcomeValue,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader title={text.navigation.auditLogs} />

      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
            <div className="font-ui text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              {commonText.totalRecords(listQuery.pagination.total)}
            </div>

            <div className="space-y-3 md:hidden">
              <CmsListSearchInput
                key={input.query?.q ?? ""}
                initialValue={input.query?.q ?? ""}
                placeholder={listText.searchPlaceholder}
                onSearchChange={(value) => {
                  updateSearchParams({ q: value, page: 1 });
                }}
              />

              <CmsListFiltersSheet
                activeFiltersCount={activeFiltersCount}
                onOpenChange={(open) => {
                  if (open) {
                    setDraftToolbarFilters(currentToolbarFilters);
                  }
                }}
                onApply={() => {
                  updateSearchParams({
                    outcome:
                      draftToolbarFilters.outcomeValue === "all"
                        ? undefined
                        : draftToolbarFilters.outcomeValue,
                    page: 1,
                  });
                }}
                onClear={() => {
                  setDraftToolbarFilters(defaultAuditLogsListToolbarFilters);
                }}
              >
                <AuditLogsListToolbarField
                  value={draftToolbarFilters.outcomeValue}
                  onValueChange={(value) => {
                    setDraftToolbarFilters({ outcomeValue: value });
                  }}
                />
              </CmsListFiltersSheet>
            </div>

            <div className="hidden gap-3 md:grid lg:grid-cols-4">
              <CmsListSearchInput
                key={input.query?.q ?? ""}
                initialValue={input.query?.q ?? ""}
                placeholder={listText.searchPlaceholder}
                className="lg:col-span-3"
                onSearchChange={(value) => {
                  updateSearchParams({ q: value, page: 1 });
                }}
              />

              <div className="grid gap-2 sm:grid-cols-1 lg:col-span-1">
                <AuditLogsListToolbarField
                  value={currentToolbarFilters.outcomeValue}
                  onValueChange={(value) => {
                    updateSearchParams({ outcome: value === "all" ? undefined : value, page: 1 });
                  }}
                />
              </div>
            </div>
          </div>
        }
        table={
          listQuery.items.length > 0 ? (
            <Table className={cmsTableClasses.table}>
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.createdAt}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.outcome}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.action}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.actor}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.details}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {listQuery.items.map((entry) => (
                  <TableRow key={entry.id} className={cmsTableClasses.bodyRow}>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDateTime(entry.createdAt)}
                    </TableCell>

                    <TableCell className={cmsTableClasses.bodyCellBadge}>
                      <CmsBadge
                        variant={
                          entry.outcome === "SUCCESS"
                            ? "category-solid-ink"
                            : "category-solid-accent"
                        }
                      >
                        {entry.outcome === "SUCCESS"
                          ? listText.outcomeSuccess
                          : listText.outcomeFailure}
                      </CmsBadge>
                    </TableCell>

                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <div className="space-y-1">
                        <div className="font-ui text-[10px] uppercase tracking-[0.06em] text-foreground">
                          {`${formatActionLabel(entry.action)}: ${
                            entry.resource === "articles"
                              ? listText.resourceArticleLabel
                              : entry.resource === "categories"
                                ? listText.resourceCategoryLabel
                                : entry.resource === "issues"
                                  ? listText.resourceIssueLabel
                                  : entry.resource === "media"
                                    ? listText.resourceMediaLabel
                                    : entry.resource === "tags"
                                      ? listText.resourceTagLabel
                                      : entry.resource === "users"
                                        ? listText.resourceUserLabel
                                        : listText.resourceUnknownLabel
                          }`}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <div className="text-foreground">
                        {entry.actorDisplayName ?? listText.actorSystem}
                      </div>
                    </TableCell>

                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <CmsAuditLogDetailDialog auditLogId={entry.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-4">
              <CmsEmptyState
                title={text.resource.emptyTitle(text.navigation.auditLogs)}
                description={listText.emptyDescription}
                descriptionFiltered={text.resource.emptyDescriptionFiltered}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          )
        }
        pagination={
          <CmsPaginationFooter
            currentPage={listQuery.pagination.page}
            totalPages={Math.max(
              1,
              Math.ceil(listQuery.pagination.total / listQuery.pagination.pageSize),
            )}
            pageSize={listQuery.pagination.pageSize}
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
