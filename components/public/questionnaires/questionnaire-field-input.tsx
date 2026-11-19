"use client";

import { QuestionnaireChoiceInput } from "@/components/public/questionnaires/questionnaire-choice-input";
import {
  choiceOptionClass,
  optionFocusClass,
  optionStateClass,
  textInputClass,
} from "@/components/public/questionnaires/questionnaire-ui";
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
      <p className="font-editorial text-[18px] leading-relaxed text-body-text">
        {field.description ?? field.label}
      </p>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        id={inputId}
        className={cn(inputClass, "min-h-36 resize-y")}
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder}
        minLength={field.minLength}
        maxLength={field.maxLength}
        required={field.required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
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
        className="grid gap-2"
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
              className="size-5 shrink-0 accent-accent"
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
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 border border-foreground bg-card p-4 font-editorial text-[17px] leading-snug text-body-text",
            optionFocusClass,
          )}
        >
          <input
            id={inputId}
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-accent"
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
                "flex min-h-12 cursor-pointer items-center justify-center border-r border-b font-ui text-sm font-bold transition-colors",
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
          <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
            {field.minLabel ? (
              <span>
                {options[0]} = {field.minLabel}
              </span>
            ) : null}
            {field.maxLabel ? (
              <span className="ml-auto text-right">
                {options[options.length - 1]} = {field.maxLabel}
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
