"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CmsActionButton } from "@/components/cms/primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { RouterOutputs } from "@/lib/trpc/types";
import type { ReactNode } from "react";

type CmsAuditLogDetailDialogProps = {
  auditLogId: string;
};

type AuditLogDetail = RouterOutputs["auditLogs"]["getById"];

type DetailAction = {
  href: string;
  label: string;
};

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

function DetailActionLink({ href, label }: DetailAction) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 border border-foreground bg-transparent px-3 py-1.5",
        "font-ui text-[10px] uppercase tracking-[0.08em] text-foreground transition-colors",
        "hover:bg-card-hover hover:text-accent",
      )}
    >
      <span aria-hidden>→</span>
      <span>{label}</span>
    </Link>
  );
}

function DetailSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 border-t-[3px] border-foreground pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function DetailRows({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <dl className="space-y-2.5">
      {fields.map((field) => (
        <div
          key={`${field.label}-${field.value}`}
          className="text-[15px] leading-normal text-foreground"
        >
          <dt className="inline font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {field.label}: {field.value}
          </dt>
        </div>
      ))}
    </dl>
  );
}

function DetailRowsSkeleton({ rows }: { rows: Array<{ labelWidth: string; valueWidth: string }> }) {
  return (
    <div className="space-y-2.5">
      {rows.map((row, index) => (
        <div
          key={`${row.labelWidth}-${row.valueWidth}-${index}`}
          className="text-[15px] leading-normal"
        >
          <Skeleton
            className={`mr-2 inline-block h-2.5 ${row.labelWidth} rounded-none bg-card-hover`}
          />
          <Skeleton className={`inline-block h-3.5 ${row.valueWidth} rounded-none bg-card-hover`} />
        </div>
      ))}
    </div>
  );
}

function resolveOutcomeLabel(
  outcome: AuditLogDetail["outcome"],
  text: typeof i18n.cms.lists.auditLogs,
) {
  return outcome === "SUCCESS" ? text.outcomeSuccess : text.outcomeFailure;
}

function resolveResourceLabel(
  resource: AuditLogDetail["resource"],
  text: typeof i18n.cms.lists.auditLogs,
) {
  if (resource === "articles") {
    return text.resourceArticleLabel;
  }

  if (resource === "categories") {
    return text.resourceCategoryLabel;
  }

  if (resource === "issues") {
    return text.resourceIssueLabel;
  }

  if (resource === "media") {
    return text.resourceMediaLabel;
  }

  if (resource === "tags") {
    return text.resourceTagLabel;
  }

  if (resource === "users") {
    return text.resourceUserLabel;
  }

  return text.resourceUnknownLabel;
}

function AuditLogDetailSkeleton({ text }: { text: typeof i18n.cms.lists.auditLogs }) {
  return (
    <div className="space-y-6">
      <DetailSection title={text.sections.event}>
        <div className="space-y-2">
          <Skeleton className="h-6 w-64 rounded-none bg-card-hover" />
          <Skeleton className="h-3 w-24 rounded-none bg-card-hover" />
        </div>
        <DetailRowsSkeleton
          rows={[
            { labelWidth: "w-24", valueWidth: "w-40" },
            { labelWidth: "w-20", valueWidth: "w-48" },
            { labelWidth: "w-16", valueWidth: "w-24" },
            { labelWidth: "w-10", valueWidth: "w-72" },
          ]}
        />
      </DetailSection>

      <DetailSection
        title={text.sections.actor}
        action={<Skeleton className="h-7 w-24 rounded-none border border-border bg-card-hover" />}
      >
        <DetailRowsSkeleton
          rows={[
            { labelWidth: "w-24", valueWidth: "w-36" },
            { labelWidth: "w-24", valueWidth: "w-48" },
            { labelWidth: "w-20", valueWidth: "w-18" },
            { labelWidth: "w-18", valueWidth: "w-56" },
          ]}
        />
      </DetailSection>

      <DetailSection title={text.sections.request}>
        <DetailRowsSkeleton
          rows={[
            { labelWidth: "w-20", valueWidth: "w-44" },
            { labelWidth: "w-10", valueWidth: "w-28" },
            { labelWidth: "w-18", valueWidth: "w-80" },
          ]}
        />
      </DetailSection>

      <DetailSection
        title={text.sections.resource}
        action={<Skeleton className="h-7 w-24 rounded-none border border-border bg-card-hover" />}
      >
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded-none bg-card-hover" />
          <Skeleton className="h-7 w-72 rounded-none bg-card-hover" />
          <Skeleton className="h-4 w-96 rounded-none bg-card-hover" />
        </div>
        <DetailRowsSkeleton
          rows={[
            { labelWidth: "w-10", valueWidth: "w-56" },
            { labelWidth: "w-14", valueWidth: "w-28" },
            { labelWidth: "w-28", valueWidth: "w-16" },
          ]}
        />
      </DetailSection>

      <DetailSection title={text.sections.error}>
        <Skeleton className="h-3 w-32 rounded-none bg-card-hover" />
        <DetailRowsSkeleton
          rows={[
            { labelWidth: "w-22", valueWidth: "w-24" },
            { labelWidth: "w-28", valueWidth: "w-72" },
          ]}
        />
      </DetailSection>

      <DetailSection title={text.sections.metadata}>
        <div className="space-y-2 border-y border-[rgba(10,10,10,0.16)] py-3">
          <Skeleton className="h-3 w-full rounded-none bg-card-hover" />
          <Skeleton className="h-3 w-11/12 rounded-none bg-card-hover" />
          <Skeleton className="h-3 w-4/5 rounded-none bg-card-hover" />
          <Skeleton className="h-3 w-2/3 rounded-none bg-card-hover" />
        </div>
      </DetailSection>
    </div>
  );
}

function resolveActorAction(detail: AuditLogDetail, text: typeof i18n.cms.lists.auditLogs) {
  if (!detail.actorId) {
    return undefined;
  }

  return {
    href: cmsCrudRoutes.users.edit(detail.actorId),
    label: text.links.openActor,
  } satisfies DetailAction;
}

function resolveResourceAction(detail: AuditLogDetail, text: typeof i18n.cms.lists.auditLogs) {
  if (detail.resource === "articles" && detail.resourceId) {
    return {
      href: cmsCrudRoutes.articles.edit(detail.resourceId),
      label: text.links.openArticle,
    } satisfies DetailAction;
  }

  if (detail.resource === "categories" && detail.resourceId) {
    return {
      href: cmsCrudRoutes.categories.edit(detail.resourceId),
      label: text.links.openCategory,
    } satisfies DetailAction;
  }

  if (detail.resource === "issues" && detail.resourceId) {
    return {
      href: cmsCrudRoutes.issues.edit(detail.resourceId),
      label: text.links.openIssue,
    } satisfies DetailAction;
  }

  if (detail.resource === "tags" && detail.resourceId) {
    return {
      href: cmsCrudRoutes.tags.edit(detail.resourceId),
      label: text.links.openTag,
    } satisfies DetailAction;
  }

  if (detail.resource === "users" && detail.resourceId) {
    return {
      href: cmsCrudRoutes.users.edit(detail.resourceId),
      label: text.links.openUser,
    } satisfies DetailAction;
  }

  if (detail.resource === "media") {
    return {
      href: "/cms/media",
      label: text.links.openMedia,
    } satisfies DetailAction;
  }

  return undefined;
}

export function CmsAuditLogDetailDialog({ auditLogId }: CmsAuditLogDetailDialogProps) {
  const [open, setOpen] = useState(false);
  const text = i18n.cms.lists.auditLogs;
  const commonText = i18n.cms.common;

  const detailQuery = trpc.auditLogs.getById.useQuery(
    { id: auditLogId },
    {
      enabled: open,
      staleTime: 30_000,
    },
  );

  const metadata = useMemo(
    () => formatMetadata(detailQuery.data?.metadata),
    [detailQuery.data?.metadata],
  );
  const detailError = detailQuery.isError ? mapTrpcErrorToCmsUiMessage(detailQuery.error) : null;

  return (
    <>
      <CmsActionButton variant="outline" size="xs" onClick={() => setOpen(true)}>
        {text.detailsCta}
      </CmsActionButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col gap-0 rounded-none border border-foreground bg-(--bg-main) p-0 ring-0 sm:max-w-2xl!"
        >
          <div className="shrink-0 border-b-[3px] border-foreground bg-background px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="font-ui text-[14px] uppercase leading-none tracking-[0.08em] text-foreground">
                  {text.detailTitle}
                </DialogTitle>
                <DialogDescription className="mt-2 font-ui text-[12px] leading-normal tracking-[0.02em] text-foreground">
                  {detailQuery.data
                    ? text.detailDescription(formatDateTime(detailQuery.data.createdAt))
                    : text.detailDescriptionPending}
                </DialogDescription>
              </div>
              <DialogClose className="inline-flex size-8 shrink-0 items-center justify-center border border-foreground bg-transparent transition-colors hover:bg-card-hover">
                <X className="size-3.5" aria-hidden />
                <span className="sr-only">{commonText.close}</span>
              </DialogClose>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {detailQuery.isPending ? (
              <AuditLogDetailSkeleton text={text} />
            ) : detailError ? (
              <div className="border-l-4 border-accent bg-white px-4 py-4">
                <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-accent">
                  {detailError.title}
                </div>
                <div className="mt-2 font-ui text-[13px] leading-normal tracking-[0.02em] text-foreground">
                  {detailError.description}
                </div>
              </div>
            ) : detailQuery.data ? (
              <div className="space-y-6">
                <DetailSection title={text.sections.event}>
                  <DetailRows
                    fields={[
                      {
                        label: text.fields.auditLogId,
                        value: detailQuery.data.id,
                      },
                      {
                        label: text.table.outcome,
                        value: resolveOutcomeLabel(detailQuery.data.outcome, text),
                      },
                      {
                        label: text.table.action,
                        value: formatActionLabel(detailQuery.data.action),
                      },
                      {
                        label: text.fields.resourceType,
                        value: resolveResourceLabel(detailQuery.data.resource, text),
                      },
                      { label: text.fields.method, value: detailQuery.data.method },
                      { label: text.fields.path, value: detailQuery.data.path },
                    ]}
                  />
                </DetailSection>

                <DetailSection
                  title={text.sections.actor}
                  action={
                    resolveActorAction(detailQuery.data, text) ? (
                      <DetailActionLink {...resolveActorAction(detailQuery.data, text)!} />
                    ) : undefined
                  }
                >
                  <DetailRows
                    fields={[
                      {
                        label: text.fields.actorDisplayName,
                        value: detailQuery.data.actorDisplayName ?? text.actorSystem,
                      },
                      {
                        label: text.fields.actorEmail,
                        value: detailQuery.data.actorEmail ?? text.actorSystem,
                      },
                      {
                        label: text.fields.actorRole,
                        value: detailQuery.data.actorRole ?? text.actorRoleMissing,
                      },
                      {
                        label: text.fields.actorId,
                        value: detailQuery.data.actorId ?? text.actorIdMissing,
                      },
                    ]}
                  />
                </DetailSection>

                <DetailSection title={text.sections.request}>
                  <DetailRows
                    fields={[
                      {
                        label: text.fields.requestId,
                        value: detailQuery.data.requestId ?? text.requestIdMissing,
                      },
                      {
                        label: text.fields.ipAddress,
                        value: detailQuery.data.ipAddress ?? text.ipAddressMissing,
                      },
                      {
                        label: text.fields.userAgent,
                        value: detailQuery.data.userAgent ?? text.userAgentMissing,
                      },
                    ]}
                  />
                </DetailSection>

                <DetailSection
                  title={text.sections.resource}
                  action={
                    resolveResourceAction(detailQuery.data, text) ? (
                      <DetailActionLink {...resolveResourceAction(detailQuery.data, text)!} />
                    ) : undefined
                  }
                >
                  {detailQuery.data.resourceSummary ? (
                    <div className="space-y-3">
                      {detailQuery.data.resourceSummary ? (
                        <DetailRows
                          fields={[
                            {
                              label: detailQuery.data.resourceSummary.missing
                                ? text.resourceNameUnavailable
                                : text.resounrceName,
                              value: detailQuery.data.resourceSummary.title,
                            },
                            ...detailQuery.data.resourceSummary.fields,
                          ]}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div className="font-ui text-[12px] leading-normal tracking-[0.02em] text-foreground">
                      {text.resourceSummaryUnavailable}
                    </div>
                  )}
                </DetailSection>

                <DetailSection
                  title={`${text.sections.error}: ${detailQuery.data.errorCode || detailQuery.data.errorMessage ? text.errorPresentEyebrow : text.noErrorEyebrow}`}
                >
                  <DetailRows
                    fields={[
                      {
                        label: text.fields.errorCode,
                        value: detailQuery.data.errorCode ?? text.noError,
                      },
                      {
                        label: text.fields.errorMessage,
                        value: detailQuery.data.errorMessage ?? text.noError,
                      },
                    ]}
                  />
                </DetailSection>

                {metadata ? (
                  <DetailSection title={text.sections.metadata}>
                    <pre className="overflow-x-auto border-y border-[rgba(10,10,10,0.16)] py-3 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap wrap-break-word">
                      {metadata}
                    </pre>
                  </DetailSection>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t-[3px] border-foreground px-6 py-4">
            <DialogClose
              render={
                <CmsActionButton variant="outline" size="md">
                  {commonText.close}
                </CmsActionButton>
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
