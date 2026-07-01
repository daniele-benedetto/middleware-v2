"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  CmsEmptyState,
  CmsErrorState,
  CmsLoadingState,
  CmsPaginationFooter,
} from "@/components/cms/common";
import { CmsDataTableShell, CmsPageHeader, cmsTableClasses } from "@/components/cms/primitives";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ObservabilityDetailDrawer,
  ObservabilityMetricCard,
  ObservabilityStatusBadge,
  ObservabilityTechnicalValues,
} from "@/features/cms/observability/components";
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

function AuditDetailDialog({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const detailQuery = trpc.observabilityAudit.detail.useQuery(
    { id },
    { enabled: open, staleTime: 30_000 },
  );
  const detail = detailQuery.data;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Dettaglio
      </Button>
      <ObservabilityDetailDrawer
        open={open}
        onOpenChange={setOpen}
        title="Dettaglio audit"
        description={detail ? formatDateTime(detail.createdAt) : "Caricamento dettaglio audit"}
      >
        {detailQuery.isPending ? <CmsLoadingState /> : null}
        {detail ? <AuditDetailContent detail={detail} /> : null}
      </ObservabilityDetailDrawer>
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
          <ObservabilityStatusBadge value={detail.riskLevel} kind="risk" />
          <ObservabilityStatusBadge value={detail.publicImpact ? "impatto pubblico" : "interno"} />
          <ObservabilityStatusBadge value={detail.outcome} kind="outcome" />
          {detail.riskReasons.map((reason) => (
            <ObservabilityStatusBadge key={reason} value={reason} />
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
        <ObservabilityTechnicalValues
          values={[
            { label: "auditId", value: detail.id },
            { label: "requestId", value: detail.requestId },
            { label: "correlationId", value: detail.correlationId },
          ]}
        />
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
        <ObservabilityMetricCard
          label="High/Critical"
          value={summaryQuery.data?.highRiskCount ?? 0}
          tone={(summaryQuery.data?.highRiskCount ?? 0) > 0 ? "warning" : "default"}
        />
        <ObservabilityMetricCard
          label="Impatto pubblico"
          value={summaryQuery.data?.publicImpactCount ?? 0}
        />
        <ObservabilityMetricCard
          label="Fallimenti"
          value={summaryQuery.data?.failureCount ?? 0}
          tone={(summaryQuery.data?.failureCount ?? 0) > 0 ? "critical" : "default"}
        />
        <ObservabilityMetricCard
          label="Attori attivi"
          value={summaryQuery.data?.activeActorCount ?? 0}
        />
      </div>
      <CmsDataTableShell
        toolbar={
          <div className="space-y-3">
            <div className={cmsMetaLabelClass}>{listQuery.pagination.total} attività audit</div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={input.query?.riskLevel === "high" ? "default" : "outline"}
                onClick={() => updateSearchParams({ riskLevel: "high", page: 1 })}
              >
                High risk
              </Button>
              <Button
                type="button"
                size="sm"
                variant={input.query?.outcome === "FAILURE" ? "default" : "outline"}
                onClick={() => updateSearchParams({ outcome: "FAILURE", page: 1 })}
              >
                Falliti
              </Button>
              <Button
                type="button"
                size="sm"
                variant={input.query?.publicImpact === true ? "default" : "outline"}
                onClick={() => updateSearchParams({ publicImpact: true, page: 1 })}
              >
                Impatto pubblico
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  updateSearchParams({
                    riskLevel: undefined,
                    outcome: undefined,
                    publicImpact: undefined,
                    page: 1,
                  })
                }
              >
                Tutti
              </Button>
            </div>
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
                      <ObservabilityStatusBadge value={entry.riskLevel} kind="risk" />
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
