"use client";

import { useState } from "react";

import {
  CmsActionButton,
  CmsCheckbox,
  CmsFormField,
  CmsMetaText,
  CmsSelect,
  CmsTextInput,
} from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";
import { toDateTimeLocalValue, toIsoDateTimeValue } from "@/lib/questionnaires/flow";
import {
  coerceQuestionnaireConditionValue,
  createQuestionnaireCondition,
  createQuestionnaireRule,
  getQuestionnaireConditionIssue,
  getQuestionnaireConditionOperators,
  getQuestionnaireConditionValueKind,
  getQuestionnaireOtherLabel,
  getQuestionnaireRuleConditions,
  getQuestionnaireRuleMatch,
  QUESTIONNAIRE_OTHER_OPTION_ID,
  QUESTIONNAIRE_RULE_MAX_CONDITIONS,
  type QuestionnaireConditionOperator,
  type QuestionnaireConditionSourceField,
  type QuestionnaireConditionValue,
  type QuestionnaireFieldCondition,
  type QuestionnaireRule,
} from "@/lib/server/modules/questionnaires/schema/definition";

export type QuestionnaireRuleEditorText = {
  label: string;
  always: string;
};

type Props = {
  id: string;
  rule: QuestionnaireRule | undefined;
  sources: QuestionnaireConditionSourceField[];
  disabled: boolean;
  text: QuestionnaireRuleEditorText;
  onChange: (rule: QuestionnaireRule | undefined) => void;
};

const shared = i18n.cms.forms.resources.questionnaires.rules;
const operatorLabels = i18n.public.questionnaireRules.operators;
const dateOperatorLabels: Partial<Record<QuestionnaireConditionOperator, string>> =
  i18n.public.questionnaireRules.dateOperators;

function getOperatorLabel(
  source: QuestionnaireConditionSourceField,
  operator: QuestionnaireConditionOperator,
) {
  const isDate = source.type === "date" || source.type === "datetime";
  return (isDate ? dateOperatorLabels[operator] : undefined) ?? operatorLabels[operator];
}

function getOptionChoices(source: QuestionnaireConditionSourceField) {
  if (source.type !== "singleChoice" && source.type !== "multipleChoice") return [];
  return [
    ...source.options.map((option) => ({ value: option.id, label: option.label })),
    ...(source.allowOther
      ? [{ value: QUESTIONNAIRE_OTHER_OPTION_ID, label: getQuestionnaireOtherLabel(source) }]
      : []),
  ];
}

function getBooleanChoices(source: QuestionnaireConditionSourceField) {
  return source.type === "boolean"
    ? [
        { value: "true", label: source.trueLabel },
        { value: "false", label: source.falseLabel },
      ]
    : [
        { value: "true", label: shared.consentGiven },
        { value: "false", label: shared.consentNotGiven },
      ];
}

type DraftInputProps = {
  id: string;
  type: "number" | "date" | "datetime-local";
  value: string;
  disabled: boolean;
  min?: number | string;
  max?: number | string;
  step?: number;
  onCommit: (value: string) => boolean;
};

function DraftInput({ id, type, value, disabled, min, max, step, onCommit }: DraftInputProps) {
  const [draft, setDraft] = useState({ text: value, committed: value, invalid: false });
  if (draft.committed !== value) {
    setDraft({ text: value, committed: value, invalid: false });
  }

  return (
    <div className="space-y-1">
      <CmsTextInput
        id={id}
        type={type}
        tone="mono"
        min={min}
        max={max}
        step={step}
        value={draft.text}
        disabled={disabled}
        aria-invalid={draft.invalid || undefined}
        onChange={(event) => {
          const next = event.target.value;
          const accepted = next !== "" && onCommit(next);
          setDraft((current) => ({ ...current, text: next, invalid: !accepted }));
        }}
      />
      {draft.invalid ? <CmsMetaText>{shared.invalidValue}</CmsMetaText> : null}
    </div>
  );
}

type ValueEditorProps = {
  id: string;
  source: QuestionnaireConditionSourceField;
  condition: QuestionnaireFieldCondition;
  disabled: boolean;
  onCommit: (value: QuestionnaireConditionValue) => boolean;
};

function toInputValue(source: QuestionnaireConditionSourceField, value: unknown) {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return "";
  return source.type === "datetime" ? toDateTimeLocalValue(value) : value;
}

function fromInputValue(source: QuestionnaireConditionSourceField, text: string) {
  if (source.type === "date") return text;
  if (source.type === "datetime") return toIsoDateTimeValue(text);
  return Number(text);
}

function ConditionValueEditor({ id, source, condition, disabled, onCommit }: ValueEditorProps) {
  const kind = getQuestionnaireConditionValueKind(source, condition.operator);
  const { value } = condition;

  if (kind === "none") return null;

  if (kind === "boolean") {
    return (
      <CmsSelect
        value={String(value === true)}
        disabled={disabled}
        options={getBooleanChoices(source)}
        onValueChange={(next) => onCommit(next === "true")}
      />
    );
  }

  if (kind === "option") {
    return (
      <CmsSelect
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        options={getOptionChoices(source)}
        onValueChange={(next) => onCommit(next)}
      />
    );
  }

  if (kind === "options") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="space-y-2 pt-1">
        {getOptionChoices(source).map((option) => (
          <CmsCheckbox
            key={option.value}
            compact
            label={option.label}
            checked={selected.includes(option.value)}
            disabled={disabled || (selected.length === 1 && selected[0] === option.value)}
            onChange={(checked) =>
              onCommit(
                checked
                  ? [...selected, option.value]
                  : selected.filter((item) => item !== option.value),
              )
            }
          />
        ))}
      </div>
    );
  }

  const isNumeric = kind === "count" || kind === "number" || kind === "numberRange";
  const inputType = isNumeric ? "number" : source.type === "datetime" ? "datetime-local" : "date";
  const hasNumberBounds =
    source.type === "scale" || source.type === "integer" || source.type === "decimal";
  const bounds =
    kind === "count"
      ? { min: 0, max: getOptionChoices(source).length, step: 1 }
      : hasNumberBounds
        ? { min: source.min, max: source.max, step: source.step }
        : {};
  const commitScalar = (text: string) => {
    const next = fromInputValue(source, text);
    return next !== "" && !Number.isNaN(next) && onCommit(next);
  };

  if (kind !== "numberRange" && kind !== "dateRange") {
    return (
      <DraftInput
        id={id}
        type={inputType}
        value={toInputValue(source, value)}
        disabled={disabled}
        {...bounds}
        onCommit={commitScalar}
      />
    );
  }

  const [from, to] = Array.isArray(value) ? value : [];
  const commitBound = (index: 0 | 1) => (text: string) => {
    const next = fromInputValue(source, text);
    if (next === "" || Number.isNaN(next) || from === undefined || to === undefined) return false;
    return onCommit(index === 0 ? [next, to] : [from, next]);
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <CmsFormField label={shared.from} htmlFor={`${id}-from`}>
        <DraftInput
          id={`${id}-from`}
          type={inputType}
          value={toInputValue(source, from)}
          disabled={disabled}
          {...bounds}
          onCommit={commitBound(0)}
        />
      </CmsFormField>
      <CmsFormField label={shared.to} htmlFor={`${id}-to`}>
        <DraftInput
          id={`${id}-to`}
          type={inputType}
          value={toInputValue(source, to)}
          disabled={disabled}
          {...bounds}
          onCommit={commitBound(1)}
        />
      </CmsFormField>
    </div>
  );
}

export function QuestionnaireRuleEditor({ id, rule, sources, disabled, text, onChange }: Props) {
  const untitled = i18n.cms.forms.resources.questionnaires.untitledQuestion;
  const conditions = getQuestionnaireRuleConditions(rule);
  const match = rule ? getQuestionnaireRuleMatch(rule) : "all";
  const sourceOptions = sources.map((item) => ({ value: item.id, label: item.label || untitled }));
  const firstCondition = sources
    .map((source) => createQuestionnaireCondition(source))
    .find((condition) => condition !== null);
  const canAdd =
    !disabled && Boolean(firstCondition) && conditions.length < QUESTIONNAIRE_RULE_MAX_CONDITIONS;

  const commit = (next: QuestionnaireFieldCondition[], nextMatch = match) =>
    onChange(createQuestionnaireRule(next, nextMatch));

  const replace = (index: number, next: QuestionnaireFieldCondition) => {
    const source = sources.find((item) => item.id === next.fieldId);
    if (getQuestionnaireConditionIssue(next, source) !== null) return false;
    commit(conditions.map((item, itemIndex) => (itemIndex === index ? next : item)));
    return true;
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CmsMetaText variant="category">{text.label}</CmsMetaText>
        {conditions.length === 0 ? <CmsMetaText>{text.always}</CmsMetaText> : null}
      </div>

      {conditions.length > 1 ? (
        <CmsFormField label={shared.match} htmlFor={`${id}-match`}>
          <CmsSelect
            value={match}
            disabled={disabled}
            options={[
              { value: "all", label: shared.matchAll },
              { value: "any", label: shared.matchAny },
            ]}
            onValueChange={(value) => commit(conditions, value === "any" ? "any" : "all")}
          />
        </CmsFormField>
      ) : null}

      {conditions.map((condition, index) => {
        const source = sources.find((item) => item.id === condition.fieldId);
        if (!source) return null;
        const rowId = `${id}-condition-${index}`;
        const kind = getQuestionnaireConditionValueKind(source, condition.operator);

        return (
          <div
            key={rowId}
            data-testid="questionnaire-rule-condition"
            className="grid items-start gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <CmsFormField label={shared.field} htmlFor={`${rowId}-field`}>
              <CmsSelect
                value={source.id}
                disabled={disabled}
                options={sourceOptions}
                onValueChange={(value) => {
                  const next = sources.find((item) => item.id === value);
                  const created = next ? createQuestionnaireCondition(next) : null;
                  if (created) replace(index, created);
                }}
              />
            </CmsFormField>
            <CmsFormField label={shared.operator} htmlFor={`${rowId}-operator`}>
              <CmsSelect
                value={condition.operator}
                disabled={disabled}
                options={getQuestionnaireConditionOperators(source).map((operator) => ({
                  value: operator,
                  label: getOperatorLabel(source, operator),
                }))}
                onValueChange={(value) => {
                  const operator = value as QuestionnaireConditionOperator;
                  const nextValue = coerceQuestionnaireConditionValue(
                    source,
                    operator,
                    condition.value,
                  );
                  replace(
                    index,
                    nextValue === undefined
                      ? { fieldId: source.id, operator }
                      : { fieldId: source.id, operator, value: nextValue },
                  );
                }}
              />
            </CmsFormField>
            {kind === "none" ? (
              <div />
            ) : (
              <CmsFormField
                label={kind === "count" ? shared.selections : shared.value}
                htmlFor={`${rowId}-value`}
              >
                <ConditionValueEditor
                  id={`${rowId}-value`}
                  source={source}
                  condition={condition}
                  disabled={disabled}
                  onCommit={(value) => replace(index, { ...condition, value })}
                />
              </CmsFormField>
            )}
            <CmsActionButton
              type="button"
              size="xs"
              variant="ghost"
              className="md:mt-6"
              aria-label={shared.removeCondition}
              disabled={disabled}
              onClick={() => commit(conditions.filter((_, itemIndex) => itemIndex !== index))}
            >
              {shared.removeCondition}
            </CmsActionButton>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <CmsActionButton
          type="button"
          size="xs"
          variant="ghost"
          disabled={!canAdd}
          onClick={() => {
            if (firstCondition) commit([...conditions, firstCondition]);
          }}
        >
          {shared.addCondition}
        </CmsActionButton>
      </div>
      {sources.length === 0 ? <CmsMetaText>{shared.noSources}</CmsMetaText> : null}
    </div>
  );
}
