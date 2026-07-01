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
import { parseObservabilityErrorsListSearchParams } from "@/lib/cms/query";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { ObservabilityErrorsListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";
import type { ReactNode } from "react";

type ObservabilityErrorsListInput = RouterInputs["observabilityErrors"]["list"];
type ObservabilityErrorDetail = RouterOutputs["observabilityErrors"]["detail"];

type CmsErrorsScreenProps = {
  initialInput?: ObservabilityErrorsListInput;
  initialData?: ObservabilityErrorsListInitialData;
};

type ErrorsToolbarFiltersState = {
  sourceValue: string;
  severityValue: string;
  statusValue: string;
  impactAreaValue: string;
  userImpactValue: string;
  regressionValue: string;
  releaseValue: string;
  fromValue: string;
  toValue: string;
};

const defaultErrorsToolbarFilters: ErrorsToolbarFiltersState = {
  sourceValue: "all",
  severityValue: "all",
  statusValue: "all",
  impactAreaValue: "all",
  userImpactValue: "all",
  regressionValue: "all",
  releaseValue: "",
  fromValue: "",
  toValue: "",
};

const statusOptions = ["open", "investigating", "resolved", "ignored"] as const;

function isSameInput(
  left: ObservabilityErrorsListInput | undefined,
  right: ObservabilityErrorsListInput,
) {
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

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

function copyTechnicalValue(value: string | null | undefined) {
  if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
    return;
  }

  void navigator.clipboard.writeText(value).catch(() => undefined);
}

function resolveSourceLabel(source: string) {
  if (source === "server") {
    return "Server";
  }

  if (source === "boundary") {
    return "Boundary";
  }

  return "Client";
}

function resolveSeverityVariant(severity: string) {
  if (severity === "critical" || severity === "high") {
    return "category-solid-accent" as const;
  }

  if (severity === "medium") {
    return "category-solid-ink" as const;
  }

  return "status-archived" as const;
}

function buildErrorsToolbarFiltersState(
  input: ObservabilityErrorsListInput,
): ErrorsToolbarFiltersState {
  return {
    sourceValue: input.query?.source ?? defaultErrorsToolbarFilters.sourceValue,
    severityValue: input.query?.severity ?? defaultErrorsToolbarFilters.severityValue,
    statusValue: input.query?.status ?? defaultErrorsToolbarFilters.statusValue,
    impactAreaValue: input.query?.impactArea ?? defaultErrorsToolbarFilters.impactAreaValue,
    userImpactValue: input.query?.userImpact ?? defaultErrorsToolbarFilters.userImpactValue,
    regressionValue:
      input.query?.regression === true ? "true" : defaultErrorsToolbarFilters.regressionValue,
    releaseValue: input.query?.release ?? defaultErrorsToolbarFilters.releaseValue,
    fromValue: input.query?.from ?? defaultErrorsToolbarFilters.fromValue,
    toValue: input.query?.to ?? defaultErrorsToolbarFilters.toValue,
  };
}

function TextFilterField({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className={cmsMetaLabelClass}>{label}</div>
      <input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          "h-10 w-full rounded-[var(--radius-panel)] border-2 border-foreground bg-background px-3",
          "font-editorial text-sm text-foreground shadow-none outline-none transition-all",
          "focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2",
        )}
      />
    </div>
  );
}

function FilterField({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className={cmsMetaLabelClass}>{label}</div>
      <CmsSelect value={value} onValueChange={onValueChange} options={options} />
    </div>
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

function CopyTechnicalValueButton({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) {
    return null;
  }

  return (
    <button
      type="button"
      className="rounded-[var(--radius-panel)] border border-foreground px-2 py-1 font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-foreground transition-all hover:bg-card-hover focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
      onClick={() => {
        copyTechnicalValue(value);
      }}
    >
      Copia {label}
    </button>
  );
}

function ErrorStatusSelect({ detail }: { detail: ObservabilityErrorDetail }) {
  const utils = trpc.useUtils();
  const mutation = trpc.observabilityErrors.updateStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.observabilityErrors.list.invalidate(),
        utils.observabilityErrors.detail.invalidate({ id: detail.id }),
      ]);
    },
  });

  return (
    <CmsSelect
      value={detail.status}
      onValueChange={(status) => {
        if (status !== detail.status) {
          mutation.mutate({ id: detail.id, status: status as (typeof statusOptions)[number] });
        }
      }}
      options={statusOptions.map((status) => ({ value: status, label: humanize(status) }))}
    />
  );
}

function ErrorDetailContent({ detail }: { detail: ObservabilityErrorDetail }) {
  return (
    <div className="space-y-6">
      <DetailSection title="Gruppo">
        <DetailRows
          fields={[
            { label: "ID", value: detail.id },
            { label: "Titolo", value: detail.title },
            { label: "Sorgente", value: resolveSourceLabel(detail.source) },
            { label: "Severita", value: humanize(detail.severity) },
            { label: "Impatto", value: humanize(detail.userImpact) },
            { label: "Area", value: humanize(detail.impactArea) },
            { label: "Priorita", value: String(detail.priorityScore) },
            { label: "Motivi priorita", value: detail.priorityReasons.join(", ") || "-" },
            { label: "Regressione", value: detail.regression ? "si" : "no" },
            { label: "Occorrenze", value: String(detail.occurrenceCount) },
            { label: "Sessioni impattate", value: String(detail.affectedSessions) },
            { label: "Release iniziale", value: detail.firstRelease ?? "-" },
            { label: "Release ultima", value: detail.lastRelease ?? "-" },
            { label: "Prima vista", value: formatDateTime(detail.firstSeenAt) },
            { label: "Ultima vista", value: formatDateTime(detail.lastSeenAt) },
            { label: "Riaperto", value: formatDateTime(detail.reopenedAt) },
          ]}
        />
      </DetailSection>

      <DetailSection title="Stato operativo">
        <ErrorStatusSelect detail={detail} />
      </DetailSection>

      <DetailSection title="Fingerprint">
        <DetailRows
          fields={[
            { label: "Fingerprint", value: detail.fingerprint },
            { label: "Versione", value: String(detail.fingerprintVersion) },
            { label: "Signature", value: detail.errorSignature },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <CopyTechnicalValueButton label="fingerprint" value={detail.fingerprint} />
          <CopyTechnicalValueButton label="signature" value={detail.errorSignature} />
        </div>
      </DetailSection>

      <DetailSection title="Occorrenze recenti">
        <div className="space-y-4">
          {detail.occurrences.map((occurrence) => {
            const metadata = formatMetadata(occurrence.metadata);

            return (
              <div key={occurrence.id} className="border-y border-(--line-section) py-3">
                <DetailRows
                  fields={[
                    { label: "Occorrenza", value: occurrence.id },
                    { label: "Quando", value: formatDateTime(occurrence.occurredAt) },
                    { label: "Sessione", value: occurrence.sessionId ?? "-" },
                    { label: "Request", value: occurrence.requestId ?? "-" },
                    { label: "Correlation", value: occurrence.correlationId ?? "-" },
                    { label: "Path", value: occurrence.path ?? occurrence.routePath ?? "-" },
                    { label: "Metodo", value: occurrence.method ?? "-" },
                    { label: "Status", value: occurrence.statusCode?.toString() ?? "-" },
                    { label: "Azione", value: occurrence.actionContext ?? "-" },
                  ]}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <CopyTechnicalValueButton label="requestId" value={occurrence.requestId} />
                  <CopyTechnicalValueButton label="sessionId" value={occurrence.sessionId} />
                  <CopyTechnicalValueButton
                    label="correlationId"
                    value={occurrence.correlationId}
                  />
                </div>
                {occurrence.stackTraceRedacted ? (
                  <pre className="mt-3 overflow-x-auto font-mono text-[12px] leading-relaxed text-foreground">
                    {occurrence.stackTraceRedacted}
                  </pre>
                ) : null}
                {metadata ? (
                  <pre className="mt-3 overflow-x-auto font-mono text-[12px] leading-relaxed text-muted-foreground">
                    {metadata}
                  </pre>
                ) : null}
              </div>
            );
          })}
        </div>
      </DetailSection>
    </div>
  );
}

function ErrorDetailDialog({ errorId }: { errorId: string }) {
  const [open, setOpen] = useState(false);
  const detailQuery = trpc.observabilityErrors.detail.useQuery(
    { id: errorId },
    {
      enabled: open,
      staleTime: 30_000,
    },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-panel)]",
          "border border-foreground bg-transparent px-3 py-1.5 font-ui text-[12px] font-bold text-foreground",
          "transition-all hover:bg-card-hover focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2",
        )}
      >
        Dettagli
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-2 border-foreground bg-card p-0 text-foreground shadow-none sm:max-w-4xl">
        <div className="border-b-2 border-foreground p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <DialogTitle className="font-display text-3xl leading-none">Errore</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Gruppo interpretato con occorrenze raw correlate.
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
              <DetailSection title="Gruppo">
                <DetailRowsSkeleton />
              </DetailSection>
              <DetailSection title="Occorrenze">
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
            <div className="text-sm text-muted-foreground">Caricamento dettaglio.</div>
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

  const input = parseObservabilityErrorsListSearchParams(searchParams);
  const currentToolbarFilters = buildErrorsToolbarFiltersState(input);
  const [draftToolbarFilters, setDraftToolbarFilters] = useState(currentToolbarFilters);

  const query = trpc.observabilityErrors.list.useQuery(input, {
    ...cmsListQueryOptions,
    initialData: isSameInput(initialInput, input) ? initialData : undefined,
  });

  const { updateSearchParams } = useCmsListUrlState({
    baseParams: {
      page: input.page,
      pageSize: input.pageSize,
      q: input.query?.q,
      source: input.query?.source,
      severity: input.query?.severity,
      status: input.query?.status,
      impactArea: input.query?.impactArea,
      userImpact: input.query?.userImpact,
      regression: input.query?.regression,
      release: input.query?.release,
      from: input.query?.from,
      to: input.query?.to,
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

  const hasActiveFilters = Boolean(
    input.query?.q ||
    input.query?.source ||
    input.query?.severity ||
    input.query?.status ||
    input.query?.impactArea ||
    input.query?.userImpact ||
    input.query?.regression ||
    input.query?.release ||
    input.query?.from ||
    input.query?.to,
  );
  const activeFiltersCount = [
    currentToolbarFilters.sourceValue !== "all",
    currentToolbarFilters.severityValue !== "all",
    currentToolbarFilters.statusValue !== "all",
    currentToolbarFilters.impactAreaValue !== "all",
    currentToolbarFilters.userImpactValue !== "all",
    currentToolbarFilters.regressionValue !== "all",
    currentToolbarFilters.releaseValue !== "",
    currentToolbarFilters.fromValue !== "",
    currentToolbarFilters.toValue !== "",
  ].filter(Boolean).length;
  const visibleCriticalOrHigh = query.data.items.filter(
    (entry) => entry.severity === "critical" || entry.severity === "high",
  ).length;
  const visibleOpen = query.data.items.filter((entry) => entry.status === "open").length;
  const visibleRegressions = query.data.items.filter((entry) => entry.regression).length;

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

            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: "Critical/high visibili", value: visibleCriticalOrHigh },
                { label: "Open visibili", value: visibleOpen },
                { label: "Regressioni visibili", value: visibleRegressions },
              ].map((item) => (
                <div key={item.label} className="border-2 border-foreground bg-card p-3">
                  <div className={cmsMetaLabelClass}>{item.label}</div>
                  <div className="font-display text-3xl leading-none text-foreground">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex flex-wrap gap-2">
                {["open", "investigating", "resolved", "ignored"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={cn(
                      "rounded-[var(--radius-panel)] border-2 border-foreground px-3 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.08em]",
                      input.query?.status === status
                        ? "bg-foreground text-background"
                        : "bg-card text-foreground hover:bg-card-hover",
                    )}
                    onClick={() => {
                      updateSearchParams({ status, page: 1 });
                    }}
                  >
                    {humanize(status)}
                  </button>
                ))}
                <button
                  type="button"
                  className={cn(
                    "rounded-[var(--radius-panel)] border-2 border-foreground px-3 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.08em]",
                    input.query?.regression
                      ? "bg-foreground text-background"
                      : "bg-card text-foreground hover:bg-card-hover",
                  )}
                  onClick={() => {
                    updateSearchParams({ regression: true, page: 1 });
                  }}
                >
                  Regressioni
                </button>
              </div>

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
                    severity:
                      draftToolbarFilters.severityValue === "all"
                        ? undefined
                        : draftToolbarFilters.severityValue,
                    status:
                      draftToolbarFilters.statusValue === "all"
                        ? undefined
                        : draftToolbarFilters.statusValue,
                    impactArea:
                      draftToolbarFilters.impactAreaValue === "all"
                        ? undefined
                        : draftToolbarFilters.impactAreaValue,
                    userImpact:
                      draftToolbarFilters.userImpactValue === "all"
                        ? undefined
                        : draftToolbarFilters.userImpactValue,
                    regression: draftToolbarFilters.regressionValue === "true" ? true : undefined,
                    release: draftToolbarFilters.releaseValue.trim() || undefined,
                    from: draftToolbarFilters.fromValue.trim() || undefined,
                    to: draftToolbarFilters.toValue.trim() || undefined,
                    page: 1,
                  });
                }}
                onClear={() => {
                  setDraftToolbarFilters(defaultErrorsToolbarFilters);
                }}
              >
                <div className="space-y-4">
                  <FilterField
                    label="Sorgente"
                    value={draftToolbarFilters.sourceValue}
                    onValueChange={(value) => {
                      setDraftToolbarFilters((current) => ({ ...current, sourceValue: value }));
                    }}
                    options={[
                      { value: "all", label: "Tutte" },
                      { value: "server", label: "Server" },
                      { value: "client", label: "Client" },
                      { value: "boundary", label: "Boundary" },
                    ]}
                  />
                  <FilterField
                    label="Severita"
                    value={draftToolbarFilters.severityValue}
                    onValueChange={(value) => {
                      setDraftToolbarFilters((current) => ({ ...current, severityValue: value }));
                    }}
                    options={[
                      { value: "all", label: "Tutte" },
                      { value: "critical", label: "Critical" },
                      { value: "high", label: "High" },
                      { value: "medium", label: "Medium" },
                      { value: "low", label: "Low" },
                    ]}
                  />
                  <FilterField
                    label="Stato"
                    value={draftToolbarFilters.statusValue}
                    onValueChange={(value) => {
                      setDraftToolbarFilters((current) => ({ ...current, statusValue: value }));
                    }}
                    options={[
                      { value: "all", label: "Tutti" },
                      ...statusOptions.map((status) => ({
                        value: status,
                        label: humanize(status),
                      })),
                    ]}
                  />
                  <FilterField
                    label="Area impatto"
                    value={draftToolbarFilters.impactAreaValue}
                    onValueChange={(value) => {
                      setDraftToolbarFilters((current) => ({ ...current, impactAreaValue: value }));
                    }}
                    options={[
                      { value: "all", label: "Tutte" },
                      { value: "auth", label: "Auth" },
                      { value: "editorial", label: "Editorial" },
                      { value: "media", label: "Media" },
                      { value: "cms", label: "CMS" },
                      { value: "public_site", label: "Public site" },
                      { value: "unknown", label: "Unknown" },
                    ]}
                  />
                  <FilterField
                    label="Impatto utente"
                    value={draftToolbarFilters.userImpactValue}
                    onValueChange={(value) => {
                      setDraftToolbarFilters((current) => ({ ...current, userImpactValue: value }));
                    }}
                    options={[
                      { value: "all", label: "Tutti" },
                      { value: "none", label: "None" },
                      { value: "minor", label: "Minor" },
                      { value: "blocked_action", label: "Blocked action" },
                      { value: "lost_content", label: "Lost content" },
                    ]}
                  />
                  <FilterField
                    label="Regressione"
                    value={draftToolbarFilters.regressionValue}
                    onValueChange={(value) => {
                      setDraftToolbarFilters((current) => ({ ...current, regressionValue: value }));
                    }}
                    options={[
                      { value: "all", label: "Tutte" },
                      { value: "true", label: "Solo regressioni" },
                    ]}
                  />
                  <TextFilterField
                    label="Release"
                    value={draftToolbarFilters.releaseValue}
                    onValueChange={(value) => {
                      setDraftToolbarFilters((current) => ({ ...current, releaseValue: value }));
                    }}
                  />
                  <TextFilterField
                    label="Da (ISO)"
                    value={draftToolbarFilters.fromValue}
                    onValueChange={(value) => {
                      setDraftToolbarFilters((current) => ({ ...current, fromValue: value }));
                    }}
                  />
                  <TextFilterField
                    label="A (ISO)"
                    value={draftToolbarFilters.toValue}
                    onValueChange={(value) => {
                      setDraftToolbarFilters((current) => ({ ...current, toValue: value }));
                    }}
                  />
                </div>
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
                  <TableHead className={cmsTableClasses.headerCell}>Priorita</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Ultima vista</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Severita</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Stato</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Errore</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Impatto</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Occorrenze</TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>Dettagli</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {query.data.items.map((entry) => (
                  <TableRow key={entry.id} className={cmsTableClasses.bodyRow}>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <div className="font-ui text-sm font-bold">{entry.priorityScore}</div>
                      <div className="mt-1 max-w-40 truncate text-xs text-muted-foreground">
                        {entry.priorityReasons.slice(0, 2).join(", ") || "-"}
                      </div>
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDateTime(entry.lastSeenAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellBadge}>
                      <CmsBadge variant={resolveSeverityVariant(entry.severity)}>
                        {humanize(entry.severity)}
                      </CmsBadge>
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellBadge}>
                      <CmsBadge variant="status-archived">{humanize(entry.status)}</CmsBadge>
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <div className="max-w-md truncate text-foreground">{entry.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {resolveSourceLabel(entry.source)} · {humanize(entry.impactArea)}
                        {entry.regression ? " · regressione" : ""}
                      </div>
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {humanize(entry.userImpact)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {entry.occurrenceCount} / {entry.affectedSessions} sessioni
                    </TableCell>
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
