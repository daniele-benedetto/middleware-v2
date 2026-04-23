"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  CmsEmptyState,
  CmsErrorState,
  CmsListToolbar,
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
import { useIssuesListQuery } from "@/features/cms/shared/hooks";
import { parseIssuesListSearchParams, serializeCmsSearchParams } from "@/lib/cms/query";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";

export function CmsIssuesListScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const input = parseIssuesListSearchParams(searchParams);
  const listQuery = useIssuesListQuery(input);

  const text = i18n.cms;

  const updateSearchParams = (patch: Record<string, string | number | undefined>) => {
    const nextParams = serializeCmsSearchParams({
      page: input.page,
      pageSize: input.pageSize,
      q: input.query?.q,
      sortBy: input.query?.sortBy,
      sortOrder: input.query?.sortOrder,
      isActive: input.query?.isActive,
      published: input.query?.published,
      ...patch,
    });

    const next = nextParams.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  };

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

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title={text.navigation.issues}
        subtitle="Integrazione tRPC attiva con filtri/paginazione persistenti in URL."
      />

      <CmsDataTableShell
        toolbar={
          <CmsListToolbar
            searchValue={input.query?.q ?? ""}
            onSearchChange={(value) => {
              updateSearchParams({ q: value, page: 1 });
            }}
          />
        }
        table={
          listQuery.items.length > 0 ? (
            <Table className={cmsTableClasses.table}>
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead className={cmsTableClasses.headerCell}>Titolo</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Slug</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.items.map((issue) => (
                  <TableRow key={issue.id} className={cmsTableClasses.bodyRow}>
                    <TableCell className={cmsTableClasses.bodyCellTitle}>{issue.title}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{issue.slug}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{issue.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-4">
              <CmsEmptyState
                eyebrow="Issues"
                title={text.resource.emptyTitle(text.navigation.issues)}
                description={text.resource.emptyDescription}
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

      <div className="font-ui text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
        Totale: {listQuery.pagination.total} record
      </div>
    </div>
  );
}
