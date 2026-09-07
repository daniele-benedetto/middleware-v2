"use client";

import { Download, Eye, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CmsEmptyState, CmsErrorState, CmsPaginationFooter } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsDataTableShell,
  CmsPageHeader,
  cmsToast,
  cmsTableClasses,
} from "@/components/cms/primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
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
import { CmsQuestionnaireResponsesLoading } from "@/features/cms/questionnaires/components/questionnaire-list-loading";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

import type { QuestionnaireResponsesListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterOutputs } from "@/lib/trpc/types";

type QuestionnaireDetail = RouterOutputs["questionnaires"]["getById"];
type ResponseDetail = RouterOutputs["questionnaires"]["getResponseById"];

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
}

function formatAnswer(
  value: unknown,
  field: QuestionnaireDetail["definition"]["steps"][number]["fields"][number],
  text: typeof i18n.cms.lists.questionnaires.responses,
) {
  if (value === undefined || value === null || value === "") return text.answerMissing;
  if (field.type === "boolean" || field.type === "consent")
    return value === true ? text.answerYes : text.answerNo;
  if (field.type === "singleChoice" && typeof value === "string")
    return field.options.find((option) => option.id === value)?.label ?? text.invalidValue;
  if (field.type === "multipleChoice" && Array.isArray(value))
    return value
      .map(
        (optionId) =>
          field.options.find((option) => option.id === optionId)?.label ?? text.invalidValue,
      )
      .join(", ");
  if (typeof value === "string" || typeof value === "number") return String(value);
  return text.invalidValue;
}

function ResponseDetailDialog({
  questionnaire,
  responseId,
}: {
  questionnaire: QuestionnaireDetail;
  responseId: string;
}) {
  const [open, setOpen] = useState(false);
  const text = i18n.cms.lists.questionnaires.responses;
  const query = trpc.questionnaires.getResponseById.useQuery(
    { id: responseId, questionnaireId: questionnaire.id },
    { enabled: open, staleTime: 30_000 },
  );
  const error = query.isError ? mapTrpcErrorToCmsUiMessage(query.error) : null;

  return (
    <>
      <CmsActionButton variant="outline" size="xs" onClick={() => setOpen(true)}>
        <Eye aria-hidden />
        {text.details}
      </CmsActionButton>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col gap-0 rounded-[8px] border border-foreground bg-background p-0 sm:max-w-2xl!"
        >
          <div className="shrink-0 border-b-2 border-foreground px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="font-display text-[20px] font-black tracking-[-0.02em]">
                  {text.detailTitle}
                </DialogTitle>
                <DialogDescription className="mt-2 font-editorial text-[15px]">
                  {query.data ? text.detailDescription(formatDateTime(query.data.submittedAt)) : ""}
                </DialogDescription>
              </div>
              <DialogClose className="inline-flex size-8 items-center justify-center rounded-[6px] border border-foreground hover:bg-surface-hover">
                <X className="size-3.5" aria-hidden />
                <span className="sr-only">{i18n.cms.common.close}</span>
              </DialogClose>
            </div>
          </div>
          <div className="cms-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {query.isPending ? (
              <ResponseAnswersLoading />
            ) : error ? (
              <CmsErrorState title={error.title} description={error.description} />
            ) : query.data ? (
              <ResponseAnswers detail={query.data} text={text} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResponseAnswersLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Caricamento risposta">
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <section
          className="space-y-3 border-t-2 border-foreground pt-5 first:border-t-0 first:pt-0"
          key={sectionIndex}
        >
          <Skeleton className="h-3 w-28 rounded-[6px] bg-card-hover" />
          <div className="space-y-3">
            {Array.from({ length: sectionIndex === 0 ? 3 : 2 }).map((_, rowIndex) => (
              <div className="border-b border-border pb-3" key={rowIndex}>
                <Skeleton className="h-3 w-36 rounded-[6px] bg-card-hover" />
                <Skeleton className="mt-2 h-5 w-2/3 rounded-[6px] bg-card-hover" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ResponseAnswers({
  detail,
  text,
}: {
  detail: ResponseDetail;
  text: typeof i18n.cms.lists.questionnaires.responses;
}) {
  return (
    <div className="space-y-6">
      {detail.definitionSnapshot.steps.map((step, stepIndex) => (
        <section
          className="space-y-3 border-t-2 border-foreground pt-5 first:border-t-0 first:pt-0"
          key={step.id}
        >
          <div className="font-ui text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
            {step.title || `Step ${stepIndex + 1}`}
          </div>
          {step.description ? (
            <p className="font-editorial text-[15px] text-body-text">{step.description}</p>
          ) : null}
          <dl className="space-y-3">
            {step.fields.map((field) => (
              <div className="border-b border-border pb-3" key={field.id}>
                <dt className="font-ui text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="mt-1 font-editorial text-[16px] text-foreground">
                  {field.type === "information"
                    ? text.answerSelected
                    : formatAnswer(detail.answers[field.id], field, text)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

export function CmsQuestionnaireResponsesScreen({
  questionnaire,
  initialData,
}: {
  questionnaire: QuestionnaireDetail;
  initialData: QuestionnaireResponsesListInitialData;
}) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const text = i18n.cms.lists.questionnaires.responses;
  const query = trpc.questionnaires.listResponses.useQuery(
    { questionnaireId: questionnaire.id, page, pageSize },
    { initialData: page === 1 && pageSize === 20 ? initialData : undefined },
  );
  const exportQuery = trpc.questionnaires.exportResponsesCsv.useQuery(
    { id: questionnaire.id },
    { enabled: false },
  );
  const exportResponses = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) {
      const error = result.error ? mapTrpcErrorToCmsUiMessage(result.error) : null;
      throw new Error(error?.description ?? text.exportFailed);
    }
    const url = URL.createObjectURL(
      new Blob(["\ufeff", result.data.content], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  if (query.isPending) return <CmsQuestionnaireResponsesLoading />;
  if (query.isError) {
    const error = mapTrpcErrorToCmsUiMessage(query.error);
    return (
      <CmsErrorState
        title={error.title}
        description={error.description}
        onRetry={error.retryable ? query.refetch : undefined}
      />
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader
        title={text.title}
        actions={
          <div className="flex gap-2">
            <CmsActionButton
              variant="outline"
              isLoading={exportQuery.isFetching}
              onClick={() => {
                void exportResponses().catch((error: unknown) => {
                  const description = error instanceof Error ? error.message : text.exportFailed;
                  cmsToast.error(description);
                });
              }}
            >
              <Download aria-hidden />
              {text.exportCsv}
            </CmsActionButton>
            <CmsActionButton
              variant="outline"
              onClick={() => router.push(cmsCrudRoutes.questionnaires.edit(questionnaire.id))}
            >
              <Pencil aria-hidden />
              {text.backToQuestionnaire}
            </CmsActionButton>
          </div>
        }
      />
      <CmsDataTableShell
        toolbar={
          <div className={cmsMetaLabelClass}>
            {i18n.cms.common.totalRecords(query.data.pagination.total)}
          </div>
        }
        table={
          query.data.items.length ? (
            <Table
              className={cmsTableClasses.table}
              containerClassName={cmsTableClasses.tableContainer}
            >
              <TableHeader>
                <TableRow className={cmsTableClasses.headerRow}>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {text.table.submittedAt}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>
                    {text.table.schemaVersion}
                  </TableHead>
                  <TableHead className={cmsTableClasses.headerCell}>{text.table.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((response) => (
                  <TableRow className={cmsTableClasses.bodyRow} key={response.id}>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      {formatDateTime(response.submittedAt)}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellNumeric}>
                      {response.schemaVersion}
                    </TableCell>
                    <TableCell className={cmsTableClasses.bodyCellMeta}>
                      <ResponseDetailDialog
                        questionnaire={questionnaire}
                        responseId={response.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-4">
              <CmsEmptyState title={text.emptyTitle} description={text.emptyDescription} />
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
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        }
      />
    </div>
  );
}
