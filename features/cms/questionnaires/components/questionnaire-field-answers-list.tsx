"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useState } from "react";

import { CmsErrorState } from "@/components/cms/common";
import { CmsActionButton, CmsPagination } from "@/components/cms/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { formatResponseDateTime } from "@/features/cms/questionnaires/utils/response-format";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;
const text = i18n.cms.lists.questionnaires.responses;

function AnswersLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={text.summary.textAnswersLoading}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="border-b border-border pb-3" key={index}>
          <Skeleton className="h-3 w-28 rounded-[6px] bg-card-hover" />
          <Skeleton className="mt-2 h-5 w-3/4 rounded-[6px] bg-card-hover" />
        </div>
      ))}
    </div>
  );
}

/** Paginated free-text answers of one field, newest first. Mounted only when expanded. */
export function QuestionnaireFieldAnswersList({
  questionnaireId,
  fieldId,
  onOpenResponse,
}: {
  questionnaireId: string;
  fieldId: string;
  onOpenResponse: (responseId: string) => void;
}) {
  const [page, setPage] = useState(1);
  const query = trpc.questionnaires.listFieldAnswers.useQuery(
    { questionnaireId, fieldId, page, pageSize: PAGE_SIZE },
    { staleTime: 30_000, placeholderData: keepPreviousData },
  );

  if (query.isPending) return <AnswersLoading />;
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
  if (query.data.items.length === 0) {
    return (
      <p className="font-editorial text-[15px] text-muted-foreground">
        {text.summary.textAnswersEmpty}
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(query.data.pagination.total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <ul
        className={cn("divide-y divide-border", query.isPlaceholderData && "opacity-50")}
        aria-busy={query.isPlaceholderData || undefined}
      >
        {query.data.items.map((item) => (
          <li
            className="flex items-start justify-between gap-4 py-3 first:pt-0"
            key={item.responseId}
          >
            <div className="min-w-0">
              <p className="font-ui text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
                {formatResponseDateTime(item.submittedAt)}
              </p>
              <p className="mt-1 font-editorial text-[16px] break-words whitespace-pre-wrap text-foreground">
                {item.value}
              </p>
            </div>
            <CmsActionButton
              variant="outline"
              size="xs"
              className="shrink-0"
              onClick={() => onOpenResponse(item.responseId)}
            >
              <Eye aria-hidden />
              {text.openResponse}
            </CmsActionButton>
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CmsPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          <p className="font-ui text-[11px] font-semibold text-muted-foreground">
            {text.summary.textAnswersPage(page, totalPages)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
