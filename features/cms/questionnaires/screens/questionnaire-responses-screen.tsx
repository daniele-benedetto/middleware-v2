"use client";

import { Download, Pencil } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { CmsActionButton, CmsPageHeader, cmsToast } from "@/components/cms/primitives";
import { QuestionnaireResponseDetailDialog } from "@/features/cms/questionnaires/components/questionnaire-response-detail-dialog";
import {
  QuestionnaireResponsesTable,
  RESPONSES_DEFAULT_PAGE_SIZE,
  type QuestionnaireResponsesFilters,
} from "@/features/cms/questionnaires/components/questionnaire-responses-table";
import {
  parseQuestionnaireResultsTab,
  QuestionnaireResultsTabs,
  questionnaireResultsTabId,
  questionnaireResultsTabPanelId,
} from "@/features/cms/questionnaires/components/questionnaire-results-tabs";
import { QuestionnaireSummaryPanel } from "@/features/cms/questionnaires/components/questionnaire-summary-panel";
import { normalizeDayKey } from "@/features/cms/questionnaires/utils/rome-day-range";
import { useCmsListUrlState } from "@/features/cms/shared/hooks";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

import type {
  QuestionnaireResponsesListInitialData,
  QuestionnaireSummaryInitialData,
} from "@/features/cms/shared/types/initial-data";
import type { RouterOutputs } from "@/lib/trpc/types";

type QuestionnaireDetail = RouterOutputs["questionnaires"]["getById"];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

function parseResponsesFilters(
  searchParams: URLSearchParams | null,
): QuestionnaireResponsesFilters {
  const pageSize = parsePositiveInteger(
    searchParams?.get("pageSize") ?? null,
    RESPONSES_DEFAULT_PAGE_SIZE,
  );
  return {
    page: parsePositiveInteger(searchParams?.get("page") ?? null, 1),
    pageSize: PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : RESPONSES_DEFAULT_PAGE_SIZE,
    from: normalizeDayKey(searchParams?.get("from")),
    to: normalizeDayKey(searchParams?.get("to")),
  };
}

export function CmsQuestionnaireResponsesScreen({
  questionnaire,
  initialSummary,
  initialResponses,
}: {
  questionnaire: QuestionnaireDetail;
  initialSummary?: QuestionnaireSummaryInitialData;
  initialResponses?: QuestionnaireResponsesListInitialData;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = i18n.cms.lists.questionnaires.responses;
  const activeTab = parseQuestionnaireResultsTab(searchParams?.get("tab"));
  const filters = parseResponsesFilters(searchParams);
  const [openResponseId, setOpenResponseId] = useState<string | null>(null);
  const { updateSearchParams } = useCmsListUrlState({
    baseParams: {
      tab: activeTab === "sintesi" ? undefined : activeTab,
      page: filters.page === 1 ? undefined : filters.page,
      pageSize: filters.pageSize === RESPONSES_DEFAULT_PAGE_SIZE ? undefined : filters.pageSize,
      from: filters.from,
      to: filters.to,
    },
  });
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
      new Blob(["﻿", result.data.content], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader
        title={text.title}
        actions={
          <div className="flex flex-wrap gap-2">
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
      <QuestionnaireResultsTabs
        activeTab={activeTab}
        onChange={(tab) => updateSearchParams({ tab: tab === "sintesi" ? undefined : tab })}
      />
      {activeTab === "sintesi" ? (
        <div
          role="tabpanel"
          id={questionnaireResultsTabPanelId("sintesi")}
          aria-labelledby={questionnaireResultsTabId("sintesi")}
          className="cms-scroll min-h-0 flex-1 overflow-y-auto pr-1"
        >
          <QuestionnaireSummaryPanel
            questionnaireId={questionnaire.id}
            initialData={initialSummary}
            onOpenResponse={setOpenResponseId}
          />
        </div>
      ) : (
        <div
          role="tabpanel"
          id={questionnaireResultsTabPanelId("risposte")}
          aria-labelledby={questionnaireResultsTabId("risposte")}
          className="flex min-h-0 flex-1 flex-col"
        >
          <QuestionnaireResponsesTable
            questionnaire={questionnaire}
            filters={filters}
            initialData={initialResponses}
            onFiltersChange={(patch) =>
              updateSearchParams({
                ...patch,
                ...("page" in patch ? { page: patch.page === 1 ? undefined : patch.page } : {}),
                ...("pageSize" in patch
                  ? {
                      pageSize:
                        patch.pageSize === RESPONSES_DEFAULT_PAGE_SIZE ? undefined : patch.pageSize,
                    }
                  : {}),
              })
            }
            onOpenResponse={setOpenResponseId}
          />
        </div>
      )}
      <QuestionnaireResponseDetailDialog
        questionnaireId={questionnaire.id}
        responseId={openResponseId}
        onResponseChange={setOpenResponseId}
      />
    </div>
  );
}
