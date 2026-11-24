"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useState, type ComponentProps, type ReactNode } from "react";

import { CmsEmptyState, CmsErrorState } from "@/components/cms/common";
import { CmsBadge, CmsHeading, CmsSurface } from "@/components/cms/primitives";
import { QuestionnaireSummaryLoading } from "@/features/cms/questionnaires/components/questionnaire-list-loading";
import { QuestionnaireResponsesTimelineTable } from "@/features/cms/questionnaires/components/questionnaire-responses-timeline-table";
import { QuestionnaireRuleEditor } from "@/features/cms/questionnaires/components/questionnaire-rule-editor";
import { QuestionnaireSummaryFieldCard } from "@/features/cms/questionnaires/components/questionnaire-summary-field-card";
import { useQuestionnaireById } from "@/features/cms/questionnaires/hooks/use-questionnaire-crud";
import { formatResponseDateTime } from "@/features/cms/questionnaires/utils/response-format";
import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import {
  listQuestionnaireRuleSourceFields,
  type QuestionnaireRule,
} from "@/lib/server/modules/questionnaires/schema/definition";
import { trpc } from "@/lib/trpc/react";

import type { QuestionnaireSummaryInitialData } from "@/features/cms/shared/types/initial-data";

type Summary = QuestionnaireSummaryInitialData;
type SummaryField = Summary["fields"][number];
type StepGroup = {
  stepId: string;
  stepIndex: number;
  title: string | null;
  fields: SummaryField[];
};

const text = i18n.cms.lists.questionnaires.responses.summary;
const ruleText = i18n.cms.forms.resources.questionnaires.rules;
const numberFormatter = new Intl.NumberFormat("it-IT");

const statusBadgeVariants: Record<Summary["status"], ComponentProps<typeof CmsBadge>["variant"]> = {
  DRAFT: "status-draft",
  PUBLISHED: "status-new",
  CLOSED: "status-published",
  ARCHIVED: "status-archived",
};

function groupFieldsByStep(fields: SummaryField[]): StepGroup[] {
  const groups = new Map<string, StepGroup>();
  for (const field of fields) {
    const group = groups.get(field.stepId) ?? {
      stepId: field.stepId,
      stepIndex: field.stepIndex,
      title: field.stepTitle,
      fields: [],
    };
    group.fields.push(field);
    groups.set(field.stepId, group);
  }
  return [...groups.values()].sort((a, b) => a.stepIndex - b.stepIndex);
}

function Total({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-2 px-5 py-4">
      <dt className="font-ui text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
        {label}
      </dt>
      <dd className="font-ui text-[14px] font-bold text-foreground">{children}</dd>
    </div>
  );
}

function SummaryTotals({ summary }: { summary: Summary }) {
  return (
    <CmsSurface spacing="none">
      <dl className="grid divide-foreground max-lg:divide-y sm:grid-cols-2 lg:grid-cols-5 lg:divide-x">
        <div className="grid content-start gap-2 px-5 py-4">
          <dt className="font-ui text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
            {text.totalResponses}
          </dt>
          <dd className="font-display text-[36px] leading-none font-black tracking-[-0.03em] text-foreground">
            {numberFormatter.format(summary.responseCount)}
          </dd>
        </div>
        <Total label={text.firstResponse}>
          {summary.firstResponseAt ? formatResponseDateTime(summary.firstResponseAt) : text.noValue}
        </Total>
        <Total label={text.lastResponse}>
          {summary.lastResponseAt ? formatResponseDateTime(summary.lastResponseAt) : text.noValue}
        </Total>
        <Total label={text.status}>
          <CmsBadge variant={statusBadgeVariants[summary.status]}>
            {text.statusLabels[summary.status]}
          </CmsBadge>
        </Total>
        <Total label={text.closedAt}>
          {summary.closedAt ? formatResponseDateTime(summary.closedAt) : text.notClosed}
        </Total>
      </dl>
    </CmsSurface>
  );
}

export function QuestionnaireSummaryPanel({
  questionnaireId,
  initialData,
  onOpenResponse,
}: {
  questionnaireId: string;
  initialData?: Summary;
  onOpenResponse: (responseId: string) => void;
}) {
  const [filter, setFilter] = useState<QuestionnaireRule>();
  const query = trpc.questionnaires.getSummary.useQuery(
    { id: questionnaireId, filter },
    { initialData: filter ? undefined : initialData, placeholderData: keepPreviousData },
  );
  const questionnaire = useQuestionnaireById(questionnaireId);
  const filterSources = questionnaire.data
    ? listQuestionnaireRuleSourceFields(questionnaire.data.definition, { kind: "all" })
    : [];

  if (query.isPending) return <QuestionnaireSummaryLoading />;
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

  const summary = query.data;
  const steps = groupFieldsByStep(summary.fields);

  return (
    <div className="space-y-6 pb-6">
      {summary.totalResponseCount > 0 && filterSources.length > 0 ? (
        <CmsSurface as="section" className="grid gap-2">
          <QuestionnaireRuleEditor
            id={`${questionnaireId}-summary-filter`}
            rule={filter}
            sources={filterSources}
            disabled={false}
            text={ruleText.filter}
            onChange={setFilter}
          />
          {filter ? (
            <p
              data-testid="summary-filter-count"
              className="font-ui text-[12px] font-bold text-foreground"
            >
              {text.filteredResponses(
                numberFormatter.format(summary.responseCount),
                numberFormatter.format(summary.totalResponseCount),
              )}
            </p>
          ) : null}
        </CmsSurface>
      ) : null}
      <SummaryTotals summary={summary} />
      {summary.responseCount === 0 ? (
        <CmsSurface>
          {filter ? (
            <CmsEmptyState
              title={text.filterEmptyTitle}
              description={text.filterEmptyDescription}
            />
          ) : (
            <CmsEmptyState title={text.emptyTitle} description={text.emptyDescription} />
          )}
        </CmsSurface>
      ) : (
        <>
          <CmsSurface as="section" className="grid gap-4">
            <header className="grid gap-1">
              <CmsHeading size="section" className="text-[19px]!">
                {text.timelineTitle}
              </CmsHeading>
            </header>
            <QuestionnaireResponsesTimelineTable timeline={summary.timeline} />
          </CmsSurface>
          {steps.length === 0 ? (
            <p className="font-editorial text-[15px] text-muted-foreground">
              {text.noFieldsDescription}
            </p>
          ) : (
            <section className="space-y-6" aria-label={text.questionsTitle}>
              {steps.map((step) => (
                <section className="space-y-3" key={step.stepId}>
                  <h3 className="border-b-2 border-foreground pb-2 font-ui text-[11px] font-extrabold uppercase tracking-[.08em] text-foreground">
                    {step.title ||
                      i18n.cms.forms.resources.questionnaires.stepFallback(step.stepIndex + 1)}
                  </h3>
                  <div className="space-y-4">
                    {step.fields.map((field) => (
                      <QuestionnaireSummaryFieldCard
                        key={field.id}
                        questionnaireId={questionnaireId}
                        field={field}
                        onOpenResponse={onOpenResponse}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
