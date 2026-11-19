"use client";

import { QuestionnaireChoiceInput } from "@/components/public/questionnaires/questionnaire-choice-input";
import {
  choiceMarkerClass,
  choiceOptionClass,
  optionFocusClass,
  optionStateClass,
  questionnaireType,
  textInputClass,
} from "@/components/public/questionnaires/questionnaire-ui";
import { i18n } from "@/lib/i18n";
import { toDateTimeLocalValue, toIsoDateTimeValue } from "@/lib/questionnaires/flow";
import { cn } from "@/lib/utils";

import type { QuestionnaireAnswerError } from "@/lib/questionnaires/flow";
import type { QuestionnaireField } from "@/lib/server/modules/questionnaires/schema";

export function QuestionnaireFieldInput({
  field,
  value,
  error,
  labelId,
  descriptionId,
  onChange,
}: {
  field: QuestionnaireField;
  value: unknown;
  error?: QuestionnaireAnswerError;
  labelId: string;
  descriptionId?: string;
  onChange: (value: unknown) => void;
}) {
  const inputId = `question-${field.id}`;
  const errorId = `${inputId}-error`;
  const describedBy =
    [descriptionId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;
  const inputClass = textInputClass(Boolean(error));

  if (field.type === "information") {
    return (
      <div className="border-l-[3px] border-accent pl-4">
        <p className={cn(questionnaireType.body, "whitespace-pre-line")}>{field.label}</p>
        {field.description ? (
          <p className={cn(questionnaireType.help, "mt-1.5 whitespace-pre-line")}>
            {field.description}
          </p>
        ) : null}
      </div>
    );
  }

  if (field.type === "textarea") {
    const text = typeof value === "string" ? value : "";
    return (
      <div>
        <textarea
          id={inputId}
          className={cn(inputClass, "block min-h-36 resize-y")}
          value={text}
          placeholder={field.placeholder}
          minLength={field.minLength}
          maxLength={field.maxLength}
          required={field.required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
        {field.maxLength ? (
          <p
            aria-hidden
            className="mt-1.5 text-right font-heading text-[13px] font-medium text-muted tabular-nums"
          >
            {i18n.public.questionnaire.characterCount(text.length, field.maxLength)}
          </p>
        ) : null}
      </div>
    );
  }

  if (field.type === "boolean") {
    return (
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        aria-required={field.required}
        className="grid gap-2 sm:grid-cols-2"
      >
        {[
          { value: true, label: field.trueLabel },
          { value: false, label: field.falseLabel },
        ].map((option) => (
          <label key={String(option.value)} className={choiceOptionClass(value === option.value)}>
            <input
              id={`${inputId}-${option.value}`}
              type="radio"
              name={field.id}
              className={choiceMarkerClass}
              checked={value === option.value}
              required={field.required}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "consent") {
    return (
      <div role="group" aria-labelledby={labelId}>
        <label className={cn(choiceOptionClass(value === true), "items-start py-4")}>
          <input
            id={inputId}
            type="checkbox"
            className={cn(choiceMarkerClass, "mt-0.5")}
            checked={value === true}
            required={field.required}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>{field.consentText}</span>
        </label>
      </div>
    );
  }

  if (field.type === "singleChoice" || field.type === "multipleChoice") {
    return (
      <QuestionnaireChoiceInput
        field={field}
        value={value}
        error={error}
        inputId={inputId}
        labelId={labelId}
        describedBy={describedBy}
        onChange={onChange}
      />
    );
  }

  if (field.type === "scale") {
    const options = [];
    for (let current = field.min; current <= field.max; current += field.step ?? 1)
      options.push(current);
    return (
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        aria-required={field.required}
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(2.75rem,1fr))] border-l border-t border-foreground">
          {options.map((option) => (
            <label
              className={cn(
                "flex min-h-13 cursor-pointer items-center justify-center border-r border-b font-heading text-[17px] font-bold tabular-nums transition-colors",
                optionFocusClass,
                optionStateClass(value === option),
              )}
              key={option}
            >
              <input
                id={`${inputId}-${option}`}
                className="sr-only"
                type="radio"
                name={field.id}
                checked={value === option}
                required={field.required}
                onChange={() => onChange(option)}
              />
              {option}
            </label>
          ))}
        </div>
        {field.minLabel || field.maxLabel ? (
          <div className="mt-2.5 flex justify-between gap-4 font-heading text-[14px] leading-snug font-medium text-muted">
            {field.minLabel ? (
              <span>{i18n.public.questionnaire.scaleEnd(options[0], field.minLabel)}</span>
            ) : null}
            {field.maxLabel ? (
              <span className="ml-auto text-right">
                {i18n.public.questionnaire.scaleEnd(options[options.length - 1], field.maxLabel)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const type =
    field.type === "date"
      ? "date"
      : field.type === "datetime"
        ? "datetime-local"
        : field.type === "integer" || field.type === "decimal"
          ? "number"
          : field.type === "email"
            ? "email"
            : field.type === "phone"
              ? "tel"
              : field.type === "url"
                ? "url"
                : "text";
  const inputValue =
    field.type === "datetime" && typeof value === "string" ? toDateTimeLocalValue(value) : value;
  const dateConstraint = (constraint: string | number | undefined) =>
    field.type === "datetime" && typeof constraint === "string"
      ? toDateTimeLocalValue(constraint)
      : constraint;

  return (
    <input
      id={inputId}
      className={inputClass}
      type={type}
      value={typeof inputValue === "string" || typeof inputValue === "number" ? inputValue : ""}
      placeholder={"placeholder" in field ? field.placeholder : undefined}
      min={"min" in field && typeof field.min !== "number" ? dateConstraint(field.min) : undefined}
      max={"max" in field && typeof field.max !== "number" ? dateConstraint(field.max) : undefined}
      step={
        field.type === "decimal" ? (field.step ?? "any") : "step" in field ? field.step : undefined
      }
      inputMode={
        field.type === "decimal" ? "decimal" : field.type === "integer" ? "numeric" : undefined
      }
      autoComplete={field.type === "email" ? "email" : field.type === "phone" ? "tel" : undefined}
      autoCapitalize={field.type === "email" || field.type === "url" ? "none" : undefined}
      spellCheck={field.type === "text" ? undefined : false}
      enterKeyHint="next"
      required={field.required}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy}
      onChange={(event) =>
        onChange(
          field.type === "integer" || field.type === "decimal"
            ? event.target.value === ""
              ? undefined
              : Number(event.target.value)
            : field.type === "datetime"
              ? toIsoDateTimeValue(event.target.value)
              : event.target.value,
        )
      }
    />
  );
}
