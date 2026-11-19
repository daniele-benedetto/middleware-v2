"use client";

import { CmsFormField, CmsMetaText, CmsSelect, CmsTextInput } from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";
import {
  createQuestionnaireCondition,
  getQuestionnaireConditionOperators,
  type QuestionnaireConditionSourceField,
  type QuestionnaireField,
  type QuestionnaireFieldCondition,
} from "@/lib/server/modules/questionnaires/schema/definition";

const ALWAYS_VISIBLE = "always";

type Props = {
  field: QuestionnaireField;
  /** Eligible fields that come before `field` in the definition. */
  sources: QuestionnaireConditionSourceField[];
  disabled: boolean;
  onChange: (condition: QuestionnaireFieldCondition | undefined) => void;
};

function getValueOptions(source: QuestionnaireConditionSourceField) {
  if (source.type === "boolean") {
    return [
      { value: "true", label: source.trueLabel },
      { value: "false", label: source.falseLabel },
    ];
  }
  if (source.type === "scale") return null;
  return source.options.map((option) => ({ value: option.id, label: option.label }));
}

/** "Mostra solo se…": a single condition on the answer of an earlier field. */
export function QuestionnaireFieldVisibilitySettings({
  field,
  sources,
  disabled,
  onChange,
}: Props) {
  const text = i18n.cms.forms.resources.questionnaires.visibleWhen;
  const untitled = i18n.cms.forms.resources.questionnaires.untitledQuestion;
  const condition = field.visibleWhen;
  const source = condition ? sources.find((item) => item.id === condition.fieldId) : undefined;
  const valueOptions = source ? getValueOptions(source) : null;

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="grid gap-4 md:grid-cols-3">
        <CmsFormField label={text.label} htmlFor={`${field.id}-visible-when-field`}>
          <CmsSelect
            value={source?.id ?? ALWAYS_VISIBLE}
            disabled={disabled || sources.length === 0}
            options={[
              { value: ALWAYS_VISIBLE, label: text.always },
              ...sources.map((item) => ({ value: item.id, label: item.label || untitled })),
            ]}
            onValueChange={(value) => {
              const next = sources.find((item) => item.id === value);
              onChange(next ? (createQuestionnaireCondition(next) ?? undefined) : undefined);
            }}
          />
        </CmsFormField>
        {condition && source ? (
          <>
            <CmsFormField label={text.operator} htmlFor={`${field.id}-visible-when-operator`}>
              <CmsSelect
                value={condition.operator}
                disabled={disabled}
                options={getQuestionnaireConditionOperators(source).map((operator) => ({
                  value: operator,
                  label: text.operators[operator],
                }))}
                onValueChange={(operator) =>
                  onChange({
                    ...condition,
                    operator: operator as QuestionnaireFieldCondition["operator"],
                  })
                }
              />
            </CmsFormField>
            <CmsFormField label={text.value} htmlFor={`${field.id}-visible-when-value`}>
              {valueOptions ? (
                <CmsSelect
                  value={String(condition.value)}
                  disabled={disabled}
                  options={valueOptions}
                  onValueChange={(value) =>
                    onChange({
                      ...condition,
                      value: source.type === "boolean" ? value === "true" : value,
                    })
                  }
                />
              ) : (
                <CmsTextInput
                  id={`${field.id}-visible-when-value`}
                  type="number"
                  tone="mono"
                  min={source.type === "scale" ? source.min : undefined}
                  max={source.type === "scale" ? source.max : undefined}
                  step={source.type === "scale" ? source.step : undefined}
                  value={typeof condition.value === "number" ? condition.value : ""}
                  disabled={disabled}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    // Out-of-range or empty input is ignored: the condition must stay valid.
                    if (
                      event.target.value === "" ||
                      source.type !== "scale" ||
                      !Number.isFinite(value) ||
                      value < source.min ||
                      value > source.max
                    )
                      return;
                    onChange({ ...condition, value });
                  }}
                />
              )}
            </CmsFormField>
          </>
        ) : null}
      </div>
      <CmsMetaText>{sources.length === 0 ? text.noSources : text.hint}</CmsMetaText>
    </div>
  );
}
