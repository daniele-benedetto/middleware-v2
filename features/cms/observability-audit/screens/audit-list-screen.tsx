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
  CmsActionButton,
  CmsBadge,
  CmsDataTableShell,
  CmsPageHeader,
  cmsTableClasses,
} from "@/components/cms/primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CmsListSearchInput } from "@/features/cms/shared/components/cms-list-search-input";
import { useCmsListUrlState, useObservabilityAuditListQuery } from "@/features/cms/shared/hooks";
import { parseObservabilityAuditListSearchParams } from "@/lib/cms/query";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { trpc } from "@/lib/trpc/react";

import type { ObservabilityAuditListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type AuditListInput = RouterInputs["observabilityAudit"]["list"];
type AuditDetail = RouterOutputs["observabilityAudit"]["detail"];

type CmsAuditListScreenProps = {
  initialInput?: AuditListInput;
  initialData?: ObservabilityAuditListInitialData;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "medium" });
}

function formatValue(value: unknown) {
  if (value == null) return "-";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function CopyValue({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <button
      type="button"
      className="font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground underline decoration-dotted underline-offset-4"
      onClick={() => void navigator.clipboard.writeText(value)}
    >
      copia
    </button>
  );
}

function RiskBadge({ value }: { value: string }) {
  const variant =
    value === "critical" || value === "high" ? "category-solid-accent" : "category-outline-ink";
  return <CmsBadge variant={variant}>{value}</CmsBadge>;
}

function AuditDetailDialog({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const detailQuery = trpc.observabilityAudit.detail.useQuery(
    { id },
    { enabled: open, staleTime: 30_000 },
  );
  const detail = detailQuery.data;

  return (
    <>
      <CmsActionButton variant="outline" size="xs" onClick={() => setOpen(true)}>
        Dettaglio
      </CmsActionButton>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-[8px] border border-foreground bg-background p-0"
        >
          <div className="border-b-2 border-foreground px-6 py-4">
            <DialogTitle className="font-display text-[20px] font-black tracking-[-0.02em]">
              Dettaglio audit
            </DialogTitle>
            <DialogDescription className="mt-2 font-editorial text-[15px] text-body-text">
              {detail ? formatDateTime(detail.createdAt) : "Caricamento dettaglio audit"}
            </DialogDescription>
          </div>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {detailQuery.isPending ? <CmsLoadingState /> : null}
            {detail ? <AuditDetailContent detail={detail} /> : null}
          </div>
          <div className="border-t-2 border-foreground px-6 py-4">
            <DialogClose
              render={
                <CmsActionButton variant="outline" size="md">
                  Chiudi
                </CmsActionButton>
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuditDetailContent({ detail }: { detail: AuditDetail }) {
  const summary = detail.outcome === "SUCCESS" ? detail.afterSummary : detail.attemptedSummary;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2">
        {[
          ["Audit ID", detail.id],
          ["Attore", detail.actorDisplayName ?? "Sistema"],
          ["Risorsa", `${detail.resourceType}${detail.resourceId ? `/${detail.resourceId}` : ""}`],
          ["Request", detail.requestId ?? "-"],
        ].map(([label, value]) => (
          <div key={label} className="border border-border bg-card px-3 py-2">
            <div className="font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 break-all font-ui text-[12px] text-foreground">{value}</div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Perché conta
        </div>
        <div className="flex flex-wrap gap-2">
          <RiskBadge value={detail.riskLevel} />
          <CmsBadge
            variant={detail.publicImpact ? "category-solid-accent" : "category-outline-ink"}
          >
            {detail.publicImpact ? "impatto pubblico" : "interno"}
          </CmsBadge>
          <CmsBadge
            variant={detail.outcome === "SUCCESS" ? "category-solid-ink" : "category-solid-accent"}
          >
            {detail.outcome}
          </CmsBadge>
          {detail.riskReasons.map((reason) => (
            <CmsBadge key={reason} variant="category-outline-ink">
              {reason}
            </CmsBadge>
          ))}
        </div>
      </section>

      {summary ? (
        <section className="space-y-3">
          <div className="font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {detail.outcome === "SUCCESS" ? "Summary applicato" : "Tentativo non applicato"}
          </div>
          <div className="border border-border bg-card px-4 py-3">
            <div className="font-display text-[18px] font-black">{summary.title}</div>
            <div className="mt-1 font-editorial text-[14px] text-body-text">
              {summary.description}
            </div>
            <dl className="mt-3 grid gap-2 md:grid-cols-2">
              {summary.fields.slice(0, 12).map((field) => (
                <div key={`${field.label}-${field.value}`}>
                  <dt className="font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="break-all font-ui text-[12px]">{field.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Diff applicato
        </div>
        {detail.changes.length > 0 ? (
          <div className="divide-y divide-border border border-border">
            {detail.changes.map((change) => (
              <div key={change.id} className="grid gap-2 px-4 py-3 md:grid-cols-[160px_1fr_1fr]">
                <div className="font-ui text-[11px] font-bold uppercase tracking-[0.08em]">
                  {change.field}
                </div>
                <div className="break-all font-technical text-[11px] text-muted-foreground">
                  {formatValue(change.beforeValueRedacted)}
                </div>
                <div className="break-all font-technical text-[11px] text-foreground">
                  {formatValue(change.afterValueRedacted)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="font-editorial text-[14px] text-body-text">
            {detail.outcome === "FAILURE"
              ? "Nessun cambiamento applicato: è registrato solo il tentativo."
              : "Nessun diff applicato salvato."}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Valori tecnici
        </div>
        <div className="flex flex-wrap gap-3 text-[12px]">
          <span>
            auditId: {detail.id} <CopyValue value={detail.id} />
          </span>
          <span>
            requestId: {detail.requestId ?? "-"} <CopyValue value={detail.requestId} />
          </span>
          <span>
            correlationId: {detail.correlationId ?? "-"} <CopyValue value={detail.correlationId} />
          </span>
        </div>
      </section>
    </div>
  );
}

export function CmsAuditListScreen({ initialInput, initialData }: CmsAuditListScreenProps) {
  const searchParams = useSearchParams();
  const input = parseObservabilityAuditListSearchParams(searchParams);
  const listQuery = useObservabilityAuditListQuery(input, {
    initialDataInput: initialInput,
    initialData,
  });
  const summaryQuery = trpc.observabilityAudit.summary.useQuery(undefined, { staleTime: 30_000 });
  const { updateSearchParams } = useCmsListUrlState({
    baseParams: { page: input.page, pageSize: input.pageSize, q: input.query?.q },
  });

  if (listQuery.isPending) return <CmsLoadingState />;
  if (listQuery.isError) {
    const uiError = mapTrpcErrorToCmsUiMessage(listQuery.error);
    return (
      <CmsErrorState
        title={uiError.title}
        description={uiError.description}
        onRetry={listQuery.retry}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader title="Audit" />
      <div className="grid gap-3 px-5 pb-4 md:grid-cols-4">
        {[
          ["High/Critical", summaryQuery.data?.highRiskCount ?? 0],
          ["Impatto pubblico", summaryQuery.data?.publicImpactCount ?? 0],
          ["Fallimenti", summaryQuery.data?.failureCount ?? 0],
          ["Attori attivi", summaryQuery.data?.activeActorCount ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="border border-foreground bg-card px-4 py-3">
            <div className="font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {label}
            </div>
            <div className="mt-2 font-display text-[28px] font-black">{value}</div>
          </div>
        ))}
      </div>
      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
            <div className={cmsMetaLabelClass}>{listQuery.pagination.total} attività audit</div>
            <CmsListSearchInput
              initialValue={input.query?.q ?? ""}
              placeholder="Cerca attore, risorsa, request, errore"
              onSearchChange={(value) => updateSearchParams({ q: value, page: 1 })}
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
                  <TableHead className={cmsTableClasses.headerCell}>Quando</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Rischio</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Azione</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Attore</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Dettaglio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.items.map((entry) => (
                  <TableRow key={entry.id} className={cmsTableClasses.bodyRow}>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellBadge}>
                      <RiskBadge value={entry.riskLevel} />
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <div className="space-y-1">
                        <div className="font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-foreground">
                          {entry.action} / {entry.resourceType}
                        </div>
                        <div className="text-muted-foreground">
                          {entry.resourceTitle ?? entry.resourceId ?? "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {entry.actorDisplayName ?? "Sistema"}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <AuditDetailDialog id={entry.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-4">
              <CmsEmptyState
                title="Nessuna attività audit"
                description="Le attività audit compariranno quando una mutation CMS registra successi o fallimenti con contesto qualitativo."
                descriptionFiltered="Nessuna attività corrisponde ai filtri attivi."
                hasActiveFilters={Boolean(input.query?.q)}
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
            onPageChange={(page) => updateSearchParams({ page })}
            onPageSizeChange={(pageSize) => updateSearchParams({ pageSize, page: 1 })}
          />
        }
      />
    </div>
  );
}
