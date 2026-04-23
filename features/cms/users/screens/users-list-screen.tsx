"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  CmsEmptyState,
  CmsErrorState,
  CmsLoadingState,
  CmsPaginationFooter,
} from "@/components/cms/common";
import {
  CmsDataTableShell,
  CmsMetaText,
  CmsPageHeader,
  CmsSelect,
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
import { useUsersListQuery } from "@/features/cms/shared/hooks";
import { parseUsersListSearchParams, serializeCmsSearchParams } from "@/lib/cms/query";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("it-IT");
}

export function CmsUsersListScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const text = i18n.cms;

  const input = parseUsersListSearchParams(searchParams);
  const listQuery = useUsersListQuery(input);

  const [searchValue, setSearchValue] = useState(() => input.query?.q ?? "");

  const updateSearchParams = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const nextParams = serializeCmsSearchParams({
        page: input.page,
        pageSize: input.pageSize,
        q: input.query?.q,
        sortBy: input.query?.sortBy,
        sortOrder: input.query?.sortOrder,
        role: input.query?.role,
        ...patch,
      });

      const next = nextParams.toString();
      router.replace(next ? `${pathname}?${next}` : pathname);
    },
    [
      input.page,
      input.pageSize,
      input.query?.q,
      input.query?.role,
      input.query?.sortBy,
      input.query?.sortOrder,
      pathname,
      router,
    ],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchValue !== (input.query?.q ?? "")) {
        updateSearchParams({ q: searchValue, page: 1 });
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [input.query?.q, searchValue, updateSearchParams]);

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
        title={text.navigation.users}
        subtitle="Lista utenti admin-only con filtri, ricerca, ordinamento e paginazione."
      />

      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-4">
              <CmsTextInput
                placeholder={text.listToolbar.searchPlaceholder}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />

              <CmsSelect
                value={input.query?.role ?? "all"}
                onValueChange={(value) => {
                  updateSearchParams({ role: value === "all" ? undefined : value, page: 1 });
                }}
                options={[
                  { value: "all", label: "Ruolo: tutti" },
                  { value: "ADMIN", label: "Solo admin" },
                  { value: "EDITOR", label: "Solo editor" },
                ]}
              />

              <CmsSelect
                value={input.query?.sortBy ?? "createdAt"}
                onValueChange={(value) => {
                  updateSearchParams({ sortBy: value, page: 1 });
                }}
                options={[
                  { value: "createdAt", label: "Sort: creazione" },
                  { value: "email", label: "Sort: email" },
                ]}
              />

              <CmsSelect
                value={input.query?.sortOrder ?? "desc"}
                onValueChange={(value) => {
                  updateSearchParams({ sortOrder: value, page: 1 });
                }}
                options={[
                  { value: "desc", label: "DESC" },
                  { value: "asc", label: "ASC" },
                ]}
              />
            </div>

            <CmsMetaText variant="tiny" className="block">
              Contratto lista: `role`, `q`, `sortBy`, `sortOrder`, `page`, `pageSize`.
            </CmsMetaText>
          </div>
        }
        table={
          listQuery.items.length > 0 ? (
            <Table className={cmsTableClasses.table}>
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead className={cmsTableClasses.headerCell}>Email</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Nome</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Ruolo</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Verificata</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Articoli</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Creata</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Aggiornata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.items.map((user) => (
                  <TableRow key={user.id} className={cmsTableClasses.bodyRow}>
                    <TableCell className={cmsTableClasses.bodyCellTitle}>{user.email}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {user.name ?? "-"}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>{user.role}</TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {user.emailVerified ? "Si" : "No"}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {String(user.authoredArticlesCount)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDate(user.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-4">
              <CmsEmptyState
                eyebrow="Utenti"
                title={text.resource.emptyTitle(text.navigation.users)}
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
