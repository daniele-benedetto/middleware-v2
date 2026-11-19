"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { Eye, X } from "lucide-react";

import { CmsEmptyState, CmsErrorState, CmsPaginationFooter } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsDataTableShell,
  CmsFormField,
  CmsTextInput,
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
import { QuestionnaireResponsesTableLoading } from "@/features/cms/questionnaires/components/questionnaire-list-loading";
import {
  formatResponseAnswer,
  formatResponseDateTime,
  selectResponseKeyFields,
} from "@/features/cms/questionnaires/utils/response-format";
import { romeDayEndIso, romeDayStartIso } from "@/features/cms/questionnaires/utils/rome-day-range";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { QuestionnaireResponsesListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterOutputs } from "@/lib/trpc/types";

type QuestionnaireDetail = RouterOutputs["questionnaires"]["getById"];

export const RESPONSES_DEFAULT_PAGE_SIZE = 20;

export type QuestionnaireResponsesFilters = {
  page: number;
  pageSize: number;
  /** Europe/Rome calendar days (`YYYY-MM-DD`), both inclusive. */
  from?: string;
  to?: string;
};

const text = i18n.cms.lists.questionnaires.responses;

function DateRangeFilter({
  filters,
  invalidRange,
  onChange,
}: {
  filters: QuestionnaireResponsesFilters;
  invalidRange: boolean;
  onChange: (patch: Partial<QuestionnaireResponsesFilters>) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <CmsFormField label={text.filters.from} htmlFor="responses-filter-from" className="w-40">
        <CmsTextInput
          id="responses-filter-from"
          type="date"
          tone="ui"
          value={filters.from ?? ""}
          max={filters.to}
          onChange={(event) => onChange({ from: event.target.value || undefined })}
        />
      </CmsFormField>
      <CmsFormField
        label={text.filters.to}
        htmlFor="responses-filter-to"
        className="w-40"
        error={invalidRange ? text.filters.invalidRange : undefined}
      >
        <CmsTextInput
          id="responses-filter-to"
          type="date"
          tone="ui"
          value={filters.to ?? ""}
          min={filters.from}
          onChange={(event) => onChange({ to: event.target.value || undefined })}
        />
      </CmsFormField>
      {filters.from || filters.to ? (
        <CmsActionButton
          variant="ghost"
          size="xs"
          onClick={() => onChange({ from: undefined, to: undefined })}
        >
          <X aria-hidden />
          {text.filters.clear}
        </CmsActionButton>
      ) : null}
    </div>
  );
}

/** Individual responses, newest first, filterable by Europe/Rome submission day. */
export function QuestionnaireResponsesTable({
  questionnaire,
  filters,
  initialData,
  onFiltersChange,
  onOpenResponse,
}: {
  questionnaire: QuestionnaireDetail;
  filters: QuestionnaireResponsesFilters;
  initialData?: QuestionnaireResponsesListInitialData;
  onFiltersChange: (patch: Partial<QuestionnaireResponsesFilters>) => void;
  onOpenResponse: (responseId: string) => void;
}) {
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const hasDateFilter = Boolean(filters.from || filters.to);
  const isDefaultInput =
    filters.page === 1 && filters.pageSize === RESPONSES_DEFAULT_PAGE_SIZE && !hasDateFilter;
  const query = trpc.questionnaires.listResponses.useQuery(
    {
      questionnaireId: questionnaire.id,
      page: filters.page,
      pageSize: filters.pageSize,
      submittedFrom: filters.from ? romeDayStartIso(filters.from) : undefined,
      submittedTo: filters.to ? romeDayEndIso(filters.to) : undefined,
    },
    {
      enabled: !invalidRange,
      initialData: isDefaultInput ? initialData : undefined,
      placeholderData: keepPreviousData,
    },
  );
  const keyFields = selectResponseKeyFields(questionnaire.definition);
  const changeFilters = (patch: Partial<QuestionnaireResponsesFilters>) =>
    onFiltersChange({ ...patch, page: 1 });

  if (query.isError) {
    const error = mapTrpcErrorToCmsUiMessage(query.error);
    return (
      <CmsErrorState
        title={error.title}
        description={error.description}
        onRetry={error.retryable ? () => void query.refetch() : undefined}
      />
    );
  }
  if (!query.data) {
    if (!invalidRange) return <QuestionnaireResponsesTableLoading />;
    // Invalid range on first load: nothing was fetched, keep the filter reachable.
    return (
      <CmsDataTableShell
        toolbar={<DateRangeFilter filters={filters} invalidRange onChange={changeFilters} />}
        table={null}
        pagination={null}
      />
    );
  }

  const { items, pagination } = query.data;

  return (
    <CmsDataTableShell
      toolbar={
        <div className="space-y-3">
          <div className={cmsMetaLabelClass}>{i18n.cms.common.totalRecords(pagination.total)}</div>
          <DateRangeFilter filters={filters} invalidRange={invalidRange} onChange={changeFilters} />
        </div>
      }
      table={
        items.length ? (
          <Table
            className={cn(cmsTableClasses.table, query.isPlaceholderData && "opacity-50")}
            containerClassName={cmsTableClasses.tableContainer}
            aria-busy={query.isPlaceholderData || undefined}
          >
            <TableHeader>
              <TableRow className={cmsTableClasses.headerRow}>
                <TableHead className={cmsTableClasses.headerCell}>
                  {text.table.submittedAt}
                </TableHead>
                {keyFields.map((field) => (
                  <TableHead className={cmsTableClasses.headerCell} key={field.id}>
                    <span className="block max-w-56 truncate" title={field.label}>
                      {field.label}
                    </span>
                  </TableHead>
                ))}
                <TableHead className={cmsTableClasses.headerCell}>
                  {text.table.schemaVersion}
                </TableHead>
                <TableHead className={cmsTableClasses.headerCell}>{text.table.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((response) => (
                <TableRow className={cmsTableClasses.bodyRow} key={response.id}>
                  <TableCell className={cn(cmsTableClasses.bodyCellMeta, "whitespace-nowrap")}>
                    {formatResponseDateTime(response.submittedAt)}
                  </TableCell>
                  {keyFields.map((field) => (
                    <TableCell className={cmsTableClasses.bodyCellTitle} key={field.id}>
                      <span className="line-clamp-2 max-w-64 whitespace-normal">
                        {formatResponseAnswer(response.answers[field.id], field, text)}
                      </span>
                    </TableCell>
                  ))}
                  <TableCell className={cmsTableClasses.bodyCellNumeric}>
                    {response.schemaVersion}
                  </TableCell>
                  <TableCell className={cmsTableClasses.bodyCellMeta}>
                    <CmsActionButton
                      variant="outline"
                      size="xs"
                      className={cmsTableClasses.rowActionButton}
                      onClick={() => onOpenResponse(response.id)}
                    >
                      <Eye aria-hidden />
                      {text.details}
                    </CmsActionButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="px-5 py-4">
            <CmsEmptyState
              title={text.emptyTitle}
              description={text.emptyDescription}
              descriptionFiltered={text.emptyFilteredDescription}
              hasActiveFilters={hasDateFilter}
            />
          </div>
        )
      }
      pagination={
        <CmsPaginationFooter
          currentPage={pagination.page}
          totalPages={Math.max(1, Math.ceil(pagination.total / pagination.pageSize))}
          pageSize={pagination.pageSize}
          onPageChange={(page) => onFiltersChange({ page })}
          onPageSizeChange={(pageSize) => onFiltersChange({ pageSize, page: 1 })}
        />
      }
    />
  );
}
