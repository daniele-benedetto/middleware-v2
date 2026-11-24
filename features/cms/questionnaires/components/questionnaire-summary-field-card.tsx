"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useId, useState } from "react";

import { CmsActionButton, CmsSurface } from "@/components/cms/primitives";
import {
  formatAnalysisNumber,
  formatAnalysisPercentage,
  formatAnalysisRange,
} from "@/components/public/sections/questionnaires/analysis-number-format";
import { AnalysisTable } from "@/components/public/sections/questionnaires/analysis-table";
import { QuestionnaireFieldAnswersList } from "@/features/cms/questionnaires/components/questionnaire-field-answers-list";
import { QuestionnaireOtherAnswersList } from "@/features/cms/questionnaires/components/questionnaire-other-answers-list";
import { i18n } from "@/lib/i18n";
import { formatQuestionnaireAudience } from "@/lib/questionnaires/rule-format";
import { QUESTIONNAIRE_OTHER_DEFAULT_LABEL } from "@/lib/server/modules/questionnaires/schema/definition";

import type { QuestionnaireAnalysisFieldDto } from "@/lib/server/modules/questionnaires/dto/public";
import type { RouterOutputs } from "@/lib/trpc/types";

type SummaryField = RouterOutputs["questionnaires"]["getSummary"]["fields"][number];
type OtherAnswer = NonNullable<
  Extract<SummaryField["result"], { kind: "analysis" }>["otherAnswers"]
>[number];
type Stat = { label: string; value: string };

const text = i18n.cms.lists.questionnaires.responses.summary;

function buildStats(field: SummaryField): Stat[] {
  const stats: Stat[] = [
    { label: text.answered, value: formatAnalysisNumber(field.answeredCount) },
    { label: text.missing, value: formatAnalysisNumber(field.missingCount) },
  ];
  if (field.audience) {
    stats.push({
      label: text.notShown,
      value: formatAnalysisNumber(field.audience.totalCount - field.audience.shownCount),
    });
  }
  if (field.invalidCount > 0) {
    stats.push({ label: text.invalid, value: formatAnalysisNumber(field.invalidCount) });
  }
  if (field.result.kind !== "analysis") return stats;

  const { analysis } = field.result;
  if (analysis.kind !== "number" || analysis.responseCount === 0) return stats;
  if (analysis.average !== null) {
    stats.push({ label: text.average, value: formatAnalysisNumber(analysis.average) });
  }
  if (analysis.median !== null) {
    stats.push({ label: text.median, value: formatAnalysisNumber(analysis.median) });
  }
  if (analysis.minimum !== null && analysis.maximum !== null) {
    stats.push({
      label: text.range,
      value: formatAnalysisRange(analysis.minimum, analysis.maximum),
    });
  }
  return stats;
}

function getOtherChoiceLabel(analysis: QuestionnaireAnalysisFieldDto) {
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
              {formatAnalysisNumber(row.count)}
            </span>
            {total > 0 ? (
              <span className="font-ui text-[12px] font-semibold text-muted-foreground">
                {formatAnalysisPercentage((row.count / total) * 100)}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

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
        <div>
          <h4 className="min-w-0 font-display text-[19px] leading-[1.2] font-extrabold tracking-[-0.01em] text-balance text-foreground">
            {field.label}
          </h4>
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
          <AnalysisTable field={result.analysis} />
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
