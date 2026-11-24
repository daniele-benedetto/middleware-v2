"use client";

import { Eye } from "lucide-react";
import { useState } from "react";

import { CmsActionButton, CmsPagination } from "@/components/cms/primitives";
import { formatResponseDateTime } from "@/features/cms/questionnaires/utils/response-format";
import { i18n } from "@/lib/i18n";

const PAGE_SIZE = 5;
const text = i18n.cms.lists.questionnaires.responses;

type OtherAnswer = { responseId: string; submittedAt: string; value: string };

export function QuestionnaireOtherAnswersList({
  answers,
  onOpenResponse,
}: {
  answers: OtherAnswer[];
  onOpenResponse: (responseId: string) => void;
}) {
  const [requestedPage, setRequestedPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(answers.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const items = answers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border">
        {items.map((item) => (
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
          <CmsPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setRequestedPage}
          />
          <p className="font-ui text-[11px] font-semibold text-muted-foreground">
            {text.summary.textAnswersPage(page, totalPages)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
