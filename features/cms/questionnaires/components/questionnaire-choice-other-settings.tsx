"use client";

import { CmsCheckbox, CmsFormField, CmsTextInput } from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";
import {
  QUESTIONNAIRE_OTHER_DEFAULT_LABEL,
  QUESTIONNAIRE_OTHER_DEFAULT_MAX_LENGTH,
  type QuestionnaireChoiceField,
} from "@/lib/server/modules/questionnaires/schema/definition";

type Props = {
  field: QuestionnaireChoiceField;
  disabled: boolean;
  onChange: (field: QuestionnaireChoiceField) => void;
};

/** "Altro (specificare)": extra choice with a free text, for single and multiple choice fields. */
export function QuestionnaireChoiceOtherSettings({ field, disabled, onChange }: Props) {
  const text = i18n.cms.forms.resources.questionnaires;

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <CmsCheckbox
        label={text.allowOther}
        checked={Boolean(field.allowOther)}
        disabled={disabled}
        onChange={(value) =>
          onChange(
            value
              ? { ...field, allowOther: true }
              : {
                  ...field,
                  allowOther: undefined,
                  otherLabel: undefined,
                  otherMaxLength: undefined,
                },
          )
        }
      />
      {field.allowOther ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CmsFormField label={text.otherLabel} htmlFor={`${field.id}-other-label`}>
            <CmsTextInput
              id={`${field.id}-other-label`}
              value={field.otherLabel ?? ""}
              placeholder={QUESTIONNAIRE_OTHER_DEFAULT_LABEL}
              disabled={disabled}
              onChange={(event) =>
                onChange({ ...field, otherLabel: event.target.value || undefined })
              }
            />
          </CmsFormField>
          <CmsFormField label={text.otherMaxLength} htmlFor={`${field.id}-other-max-length`}>
            <CmsTextInput
              id={`${field.id}-other-max-length`}
              type="number"
              tone="mono"
              min={1}
              value={field.otherMaxLength ?? ""}
              placeholder={String(QUESTIONNAIRE_OTHER_DEFAULT_MAX_LENGTH)}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...field,
                  otherMaxLength:
                    event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
            />
          </CmsFormField>
        </div>
      ) : null}
    </div>
  );
}
