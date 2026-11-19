"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { CmsErrorState } from "@/components/cms/common";
import { CmsActionButton } from "@/components/cms/primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatResponseAnswer,
  formatResponseDateTime,
} from "@/features/cms/questionnaires/utils/response-format";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { RouterOutputs } from "@/lib/trpc/types";

type ResponseDetail = RouterOutputs["questionnaires"]["getResponseById"];

const text = i18n.cms.lists.questionnaires.responses;

function ResponseAnswersLoading() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label={i18n.cms.forms.resources.questionnaires.responseLoading}
    >
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

function ResponseAnswers({ detail }: { detail: ResponseDetail }) {
  return (
    <div className="space-y-6">
      {detail.definitionSnapshot.steps.map((step, stepIndex) => (
        <section
          className="space-y-3 border-t-2 border-foreground pt-5 first:border-t-0 first:pt-0"
          key={step.id}
        >
          <div className="font-ui text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
            {step.title || i18n.cms.forms.resources.questionnaires.stepFallback(stepIndex + 1)}
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
                <dd className="mt-1 font-editorial text-[16px] whitespace-pre-wrap text-foreground">
                  {field.type === "information"
                    ? text.answerSelected
                    : formatResponseAnswer(detail.answers[field.id], field, text)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/**
 * Detail of one response. Controlled by the id of the open response so the
 * previous/next buttons can swap the response without closing the dialog.
 */
export function QuestionnaireResponseDetailDialog({
  questionnaireId,
  responseId,
  onResponseChange,
}: {
  questionnaireId: string;
  responseId: string | null;
  onResponseChange: (responseId: string | null) => void;
}) {
  const query = trpc.questionnaires.getResponseById.useQuery(
    { id: responseId ?? "", questionnaireId },
    { enabled: responseId !== null, staleTime: 30_000, placeholderData: keepPreviousData },
  );
  const error = query.isError ? mapTrpcErrorToCmsUiMessage(query.error) : null;
  const detail = query.data;
  // While the next response loads, the previous one stays visible (dimmed) to avoid a flash.
  const switching = query.isPlaceholderData;

  return (
    <Dialog
      open={responseId !== null}
      onOpenChange={(open) => {
        if (!open) onResponseChange(null);
      }}
    >
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
                {detail ? text.detailDescription(formatResponseDateTime(detail.submittedAt)) : ""}
              </DialogDescription>
            </div>
            <DialogClose className="inline-flex size-8 items-center justify-center rounded-[6px] border border-foreground hover:bg-surface-hover">
              <X className="size-3.5" aria-hidden />
              <span className="sr-only">{i18n.cms.common.close}</span>
            </DialogClose>
          </div>
        </div>
        <div
          className={cn(
            "cms-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5",
            switching && "opacity-50",
          )}
          aria-busy={switching || undefined}
        >
          {error ? (
            <CmsErrorState
              title={error.title}
              description={error.description}
              onRetry={error.retryable ? () => void query.refetch() : undefined}
            />
          ) : detail ? (
            <ResponseAnswers detail={detail} />
          ) : (
            <ResponseAnswersLoading />
          )}
        </div>
        <nav
          aria-label={text.responseNavigation}
          className="flex shrink-0 items-center justify-between gap-3 border-t border-foreground px-6 py-3"
        >
          <CmsActionButton
            variant="outline"
            size="xs"
            disabled={!detail?.previousResponseId || switching}
            onClick={() => onResponseChange(detail?.previousResponseId ?? null)}
          >
            <ChevronLeft aria-hidden />
            {text.previousResponse}
          </CmsActionButton>
          <CmsActionButton
            variant="outline"
            size="xs"
            disabled={!detail?.nextResponseId || switching}
            onClick={() => onResponseChange(detail?.nextResponseId ?? null)}
          >
            {text.nextResponse}
            <ChevronRight aria-hidden />
          </CmsActionButton>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
