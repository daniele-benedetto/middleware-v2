"use client";

import { useEffect, useRef, type RefObject } from "react";

import { QuestionnaireFieldError } from "@/components/public/questionnaires/questionnaire-field-error";
import {
  choiceMarkerClass,
  choiceOptionClass,
  textInputClass,
} from "@/components/public/questionnaires/questionnaire-ui";
import { i18n } from "@/lib/i18n";
import {
  getQuestionnaireOtherLabel,
  getQuestionnaireOtherMaxLength,
  isQuestionnaireOtherAnswer,
} from "@/lib/server/modules/questionnaires/schema/definition";

import type { QuestionnaireAnswerError } from "@/lib/questionnaires/flow";
import type { QuestionnaireChoiceField } from "@/lib/server/modules/questionnaires/schema/definition";

/** Free text of the "Altro" choice; takes focus when the choice has just been selected. */
function OtherTextInput({
  id,
  label,
  value,
  maxLength,
  errorId,
  errorMessage,
  focusOnMountRef,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  errorId: string;
  errorMessage?: string;
  focusOnMountRef: RefObject<boolean>;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusOnMountRef.current) return;
    focusOnMountRef.current = false;
    inputRef.current?.focus();
  }, [focusOnMountRef]);

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="text"
        className={textInputClass(Boolean(errorMessage))}
        value={value}
        maxLength={maxLength}
        placeholder={i18n.public.questionnaire.other.placeholder}
        aria-label={label}
        aria-required
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorMessage ? errorId : undefined}
        enterKeyHint="next"
        onChange={(event) => onChange(event.target.value)}
      />
      {errorMessage ? <QuestionnaireFieldError id={errorId} message={errorMessage} /> : null}
    </div>
  );
}

/** Options of a single/multiple choice question, plus the optional "Altro (specificare)" choice. */
export function QuestionnaireChoiceInput({
  field,
  value,
  error,
  inputId,
  labelId,
  describedBy,
  onChange,
}: {
  field: QuestionnaireChoiceField;
  value: unknown;
  error?: QuestionnaireAnswerError;
  inputId: string;
  labelId: string;
  describedBy?: string;
  onChange: (value: unknown) => void;
}) {
  const focusOtherOnMount = useRef(false);
  const multiple = field.type === "multipleChoice";
  const inputType = multiple ? "checkbox" : "radio";
  const selectedEntries: unknown[] = multiple && Array.isArray(value) ? value : [];
  const otherAnswer = multiple
    ? selectedEntries.find(isQuestionnaireOtherAnswer)
    : isQuestionnaireOtherAnswer(value)
      ? value
      : undefined;
  const otherSelected = field.allowOther === true && otherAnswer !== undefined;
  const otherLabel = getQuestionnaireOtherLabel(field);
  // A group of checkboxes cannot carry the invalid state: each checkbox does.
  const checkboxInvalid = multiple && error?.target === "field" ? true : undefined;

  const toggleOption = (optionId: string, checked: boolean) => {
    if (!multiple) onChange(optionId);
    else if (checked) onChange([...selectedEntries, optionId]);
    else onChange(selectedEntries.filter((entry) => entry !== optionId));
  };

  const toggleOther = (checked: boolean) => {
    focusOtherOnMount.current = checked;
    if (!multiple) onChange({ other: "" });
    else if (checked) onChange([...selectedEntries, { other: "" }]);
    else onChange(selectedEntries.filter((entry) => !isQuestionnaireOtherAnswer(entry)));
  };

  const changeOtherText = (other: string) => {
    onChange(
      multiple
        ? selectedEntries.map((entry) => (isQuestionnaireOtherAnswer(entry) ? { other } : entry))
        : { other },
    );
  };

  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      aria-invalid={multiple ? undefined : Boolean(error)}
      aria-required={multiple ? undefined : field.required}
      className="grid gap-2"
    >
      {field.options.map((option) => {
        const selected = multiple ? selectedEntries.includes(option.id) : value === option.id;
        return (
          <label className={choiceOptionClass(selected)} key={option.id}>
            <input
              id={`${inputId}-${option.id}`}
              type={inputType}
              name={field.id}
              className={choiceMarkerClass}
              checked={selected}
              required={field.required && !multiple}
              aria-invalid={checkboxInvalid}
              onChange={(event) => toggleOption(option.id, event.target.checked)}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
      {field.allowOther ? (
        <>
          <label className={choiceOptionClass(otherSelected)}>
            <input
              id={`${inputId}-other`}
              type={inputType}
              name={field.id}
              className={choiceMarkerClass}
              checked={otherSelected}
              required={field.required && !multiple}
              aria-invalid={checkboxInvalid}
              onChange={(event) => toggleOther(event.target.checked)}
            />
            <span>{otherLabel}</span>
          </label>
          {otherSelected ? (
            <OtherTextInput
              id={`${inputId}-other-text`}
              label={i18n.public.questionnaire.other.inputLabel(otherLabel)}
              value={otherAnswer.other}
              maxLength={getQuestionnaireOtherMaxLength(field)}
              errorId={`${inputId}-error`}
              errorMessage={error?.target === "other" ? error.message : undefined}
              focusOnMountRef={focusOtherOnMount}
              onChange={changeOtherText}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
