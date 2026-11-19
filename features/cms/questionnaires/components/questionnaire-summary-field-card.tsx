"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useId, useState } from "react";

import { CmsActionButton, CmsBadge, CmsSurface } from "@/components/cms/primitives";
import { AnalysisFieldRenderer } from "@/components/public/sections/questionnaires/charts/analysis-field-renderer";
import { AnalysisViewToggle } from "@/components/public/sections/questionnaires/charts/analysis-view-toggle";
import {
  getAnalysisViews,
  resolveAnalysisView,
  type AnalysisField,
  type AnalysisView,
} from "@/components/public/sections/questionnaires/charts/analysis-views";
import {
  formatChartNumber,
  formatChartPercentage,
  formatChartRange,
} from "@/components/public/sections/questionnaires/charts/chart-format";
import { QuestionnaireFieldAnswersList } from "@/features/cms/questionnaires/components/questionnaire-field-answers-list";
import { QuestionnaireOtherAnswersList } from "@/features/cms/questionnaires/components/questionnaire-other-answers-list";
import { i18n } from "@/lib/i18n";
import { formatQuestionnaireAudience } from "@/lib/questionnaires/rule-format";
import { QUESTIONNAIRE_OTHER_DEFAULT_LABEL } from "@/lib/server/modules/questionnaires/schema/definition";

import type { RouterOutputs } from "@/lib/trpc/types";

type SummaryField = RouterOutputs["questionnaires"]["getSummary"]["fields"][number];
type OtherAnswer = NonNullable<
  Extract<SummaryField["result"], { kind: "analysis" }>["otherAnswers"]
>[number];
type Stat = { label: string; value: string };

const text = i18n.cms.lists.questionnaires.responses.summary;
const publicText = i18n.public.questionnaireAnalysis;

const methodologyNotes: Record<AnalysisField["visualization"]["methodology"], string | null> = {
  binary_percentage: publicText.methodBinaryPercentage,
  category_percentage: publicText.methodCategoryPercentage,
  respondent_percentage: publicText.methodRespondentPercentage,
  ordinal_distribution: publicText.methodOrdinalDistribution,
  numeric_distribution: publicText.methodNumericDistribution,
  temporal_distribution: publicText.methodTemporalDistribution,
  no_data: null,
};

function buildStats(field: SummaryField): Stat[] {
  const stats: Stat[] = [
    { label: text.answered, value: formatChartNumber(field.answeredCount) },
    { label: text.missing, value: formatChartNumber(field.missingCount) },
  ];
  if (field.audience) {
    // Splits "senza risposta" between who saw the question and who never did.
    stats.push({
      label: text.notShown,
      value: formatChartNumber(field.audience.totalCount - field.audience.shownCount),
    });
  }
  if (field.invalidCount > 0) {
    stats.push({ label: text.invalid, value: formatChartNumber(field.invalidCount) });
  }
  if (field.result.kind !== "analysis") return stats;

  const { analysis } = field.result;
  if (analysis.kind !== "number" || analysis.responseCount === 0) return stats;
  if (analysis.average !== null) {
    stats.push({ label: text.average, value: formatChartNumber(analysis.average) });
  }
  if (analysis.median !== null) {
    stats.push({ label: text.median, value: formatChartNumber(analysis.median) });
  }
  if (analysis.minimum !== null && analysis.maximum !== null) {
    stats.push({
      label: text.range,
      value: formatChartRange(analysis.minimum, analysis.maximum),
    });
  }
  return stats;
}

/** Label of the "Altro" choice as shown in the chart of the field. */
function getOtherChoiceLabel(analysis: AnalysisField) {
  const otherOption =
    analysis.kind === "choice" ? analysis.options.find((option) => option.isOther) : undefined;
  return otherOption?.label ?? QUESTIONNAIRE_OTHER_DEFAULT_LABEL;
}

function FieldStats({ stats }: { stats: Stat[] }) {
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3 border-y border-border py-3">
      {stats.map((stat) => (
        <div className="grid gap-1" key={stat.label}>
          <dt className="font-ui text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
            {stat.label}
          </dt>
          <dd className="font-display text-[19px] leading-none font-extrabold text-foreground">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Chart/table of a chartable field, rendered with the public analysis components. */
function AnalysisResult({ analysis }: { analysis: AnalysisField }) {
  const [requestedView, setRequestedView] = useState<AnalysisView>();
  const activeView = resolveAnalysisView(analysis, requestedView);
  const methodologyNote = methodologyNotes[analysis.visualization.methodology];

  return (
    <div className="grid gap-4">
      {analysis.responseCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {methodologyNote ? (
            <p className="max-w-[68ch] font-ui text-[12px] leading-normal text-muted-foreground">
              {methodologyNote}
            </p>
          ) : (
            <span />
          )}
          <AnalysisViewToggle
            views={getAnalysisViews(analysis)}
            activeView={activeView}
            onChange={setRequestedView}
          />
        </div>
      ) : null}
      <AnalysisFieldRenderer field={analysis} view={activeView} />
    </div>
  );
}

function ConsentResult({ accepted, declined }: { accepted: number; declined: number }) {
  const total = accepted + declined;
  const rows = [
    { label: text.consentAccepted, count: accepted },
    { label: text.consentDeclined, count: declined },
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div className="rounded-[6px] border border-border px-4 py-3" key={row.label}>
          <dt className="font-ui text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
            {row.label}
          </dt>
          <dd className="mt-1.5 flex items-baseline gap-2">
            <span className="font-display text-[24px] leading-none font-black text-foreground">
              {formatChartNumber(row.count)}
            </span>
            {total > 0 ? (
              <span className="font-ui text-[12px] font-semibold text-muted-foreground">
                {formatChartPercentage((row.count / total) * 100)}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Free texts of the "Altro" choice, collapsed under the chart of the field. */
function OtherAnswersResult({
  label,
  answers,
  onOpenResponse,
}: {
  label: string;
  answers: OtherAnswer[];
  onOpenResponse: (responseId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="grid gap-4 border-t border-border pt-4">
      <div>
        <CmsActionButton
          variant="outline"
          size="xs"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
          {open ? text.otherAnswersHide(label) : text.otherAnswersShow(label, answers.length)}
        </CmsActionButton>
      </div>
      <div id={panelId} hidden={!open}>
        {open ? (
          <QuestionnaireOtherAnswersList answers={answers} onOpenResponse={onOpenResponse} />
        ) : null}
      </div>
    </div>
  );
}

/** Free-text answers stay collapsed so each field is fetched only when the admin asks for it. */
function TextResult({
  questionnaireId,
  field,
  onOpenResponse,
}: {
  questionnaireId: string;
  field: SummaryField;
  onOpenResponse: (responseId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  if (field.answeredCount === 0) {
    return (
      <p className="font-editorial text-[15px] text-muted-foreground">{text.textAnswersEmpty}</p>
    );
  }

  return (
    <div className="grid gap-4">
      <div>
        <CmsActionButton
          variant="outline"
          size="xs"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
          {open ? text.textAnswersHide : text.textAnswersShow}
        </CmsActionButton>
      </div>
      <div id={panelId} hidden={!open}>
        {open ? (
          <QuestionnaireFieldAnswersList
            questionnaireId={questionnaireId}
            fieldId={field.id}
            onOpenResponse={onOpenResponse}
          />
        ) : null}
      </div>
    </div>
  );
}

export function QuestionnaireSummaryFieldCard({
  questionnaireId,
  field,
  onOpenResponse,
}: {
  questionnaireId: string;
  field: SummaryField;
  onOpenResponse: (responseId: string) => void;
}) {
  const { result } = field;
  const audience = field.audience ? formatQuestionnaireAudience(field.audience) : null;

  return (
    <CmsSurface as="article" className="grid gap-4">
      <header className="grid gap-2">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h4 className="min-w-0 font-display text-[19px] leading-[1.2] font-extrabold tracking-[-0.01em] text-balance text-foreground">
            {field.label}
          </h4>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {field.required ? (
              <CmsBadge variant="status-draft">{text.requiredBadge}</CmsBadge>
            ) : null}
            {field.publicResults ? (
              <CmsBadge variant="status-published">{text.publicBadge}</CmsBadge>
            ) : null}
            {audience ? <CmsBadge variant="status-new">{text.conditionalBadge}</CmsBadge> : null}
          </div>
        </div>
        {field.description ? (
          <p className="max-w-[68ch] font-editorial text-[15px] text-body-text">
            {field.description}
          </p>
        ) : null}
        {audience ? (
          <p
            data-testid="summary-field-audience"
            className="max-w-[68ch] font-ui text-[12px] leading-normal text-muted-foreground"
          >
            {audience.shown}
            {audience.condition ? `. ${audience.condition}.` : "."}
          </p>
        ) : null}
      </header>
      <FieldStats stats={buildStats(field)} />
      {result.kind === "analysis" ? (
        <>
          <AnalysisResult analysis={result.analysis} />
          {result.otherAnswers?.length ? (
            <OtherAnswersResult
              label={getOtherChoiceLabel(result.analysis)}
              answers={result.otherAnswers}
              onOpenResponse={onOpenResponse}
            />
          ) : null}
        </>
      ) : result.kind === "consent" ? (
        <ConsentResult accepted={result.acceptedCount} declined={result.declinedCount} />
      ) : (
        <TextResult
          questionnaireId={questionnaireId}
          field={field}
          onOpenResponse={onOpenResponse}
        />
      )}
    </CmsSurface>
  );
}
