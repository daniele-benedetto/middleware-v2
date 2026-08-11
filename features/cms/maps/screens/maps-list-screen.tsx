"use client";

import { useSearchParams } from "next/navigation";

import {
  CmsEmptyState,
  CmsErrorState,
  CmsLoadingState,
  CmsPaginationFooter,
} from "@/components/cms/common";
import { CmsDataTableShell, CmsPageHeader, cmsTableClasses } from "@/components/cms/primitives";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CmsListSearchInput } from "@/features/cms/shared/components/cms-list-search-input";
import { useCmsListUrlState, useMapsListQuery } from "@/features/cms/shared/hooks";
import { parseMapsListSearchParams } from "@/lib/cms/query";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";

import type { MapsListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type MapsListInput = RouterInputs["maps"]["list"];

type CmsMapsListScreenProps = {
  initialInput?: MapsListInput;
  initialData?: MapsListInitialData;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}

export function CmsMapsListScreen({ initialInput, initialData }: CmsMapsListScreenProps) {
  const searchParams = useSearchParams();
  const text = i18n.cms;
  const listText = text.lists.maps;
  const input = parseMapsListSearchParams(searchParams);
  const listQuery = useMapsListQuery(input, { initialDataInput: initialInput, initialData });
  const { updateSearchParams } = useCmsListUrlState({
    baseParams: {
      page: input.page,
      pageSize: input.pageSize,
      q: input.query?.q,
      sortOrder: input.query?.sortOrder,
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

  const hasActiveFilters = Boolean(input.query?.q);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader title={text.navigation.maps} />

      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
            <div className={cmsMetaLabelClass}>
              {text.common.totalRecords(listQuery.pagination.total)}
            </div>
            <CmsListSearchInput
              initialValue={input.query?.q ?? ""}
              placeholder={text.listToolbar.searchPlaceholder}
              onSearchChange={(value) => {
                updateSearchParams({ q: value, page: 1 });
              }}
            />
          </div>
        }
        table={
          listQuery.items.length > 0 ? (
            <Table
              className={cmsTableClasses.table}
              containerClassName={cmsTableClasses.tableContainer}
            >
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.title}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.items}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.createdAt}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {listText.table.updatedAt}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.items.map((map) => (
                  <TableRow key={map.id} className={cmsTableClasses.bodyRow}>
                    <TableCell className={cmsTableClasses.bodyCellTitle}>{map.title}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellNumeric}>
                      {map.itemsCount}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(map.createdAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(map.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-4">
              <CmsEmptyState
                title={text.resource.emptyTitle(text.navigation.maps)}
                description={text.resource.emptyDescription}
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
