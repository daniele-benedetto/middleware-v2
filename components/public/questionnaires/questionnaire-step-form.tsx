"use client";

import { QuestionnaireFieldError } from "@/components/public/questionnaires/questionnaire-field-error";
import { QuestionnaireFieldInput } from "@/components/public/questionnaires/questionnaire-field-input";
import {
  questionnaireHeadingId,
  questionnaireType,
} from "@/components/public/questionnaires/questionnaire-ui";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { QuestionnaireAnswerError } from "@/lib/questionnaires/flow";
import type {
  QuestionnaireField,
  QuestionnaireStep,
} from "@/lib/server/modules/questionnaires/schema";

function isGroupField(field: QuestionnaireField) {
  return (
    field.type === "boolean" ||
    field.type === "singleChoice" ||
    field.type === "multipleChoice" ||
    field.type === "scale" ||
    field.type === "consent"
  );
}

export function QuestionnaireStepForm({
  step,
  fields,
  answers,
  errors,
  errorSummary,
  onAnswerChange,
}: {
  step: QuestionnaireStep;
  fields: QuestionnaireField[];
  answers: Record<string, unknown>;
  errors: Record<string, QuestionnaireAnswerError>;
  errorSummary: string | null;
  onAnswerChange: (id: string, value: unknown) => void;
}) {
  return (
    <section aria-labelledby={questionnaireHeadingId}>
      <div className="border-b-2 border-foreground pb-6">
        <h1
          id={questionnaireHeadingId}
          tabIndex={-1}
          className={cn(questionnaireType.stopTitle, "outline-none")}
        >
          {step.title || i18n.public.questionnaire.defaultStepTitle}
        </h1>
        {step.description ? (
          <p className={cn(questionnaireType.body, "mt-4")}>{step.description}</p>
        ) : null}
      </div>

      {errorSummary ? (
        <div
          role="alert"
          className="mt-6 border-l-[3px] border-accent bg-(--ui-error-bg) px-4 py-3 font-heading text-[15px] leading-snug font-semibold text-accent"
        >
          {errorSummary}
        </div>
      ) : null}

      <div className="divide-y divide-foreground/20">
        {fields.map((field) => {
          const error = errors[field.id];
          const inputId = `question-${field.id}`;
          const labelId = `${inputId}-label`;
          const descriptionId = field.description ? `${inputId}-description` : undefined;
          const information = field.type === "information";
          const labelClass = cn(
            "block",
            questionnaireType.question,
            error ? "text-accent" : "text-foreground",
          );
          const labelContent = (
            <>
              {field.label}
              {field.required ? (
                <span aria-hidden className="text-accent">
                  {" *"}
                </span>
              ) : null}
            </>
          );

          return (
            <section
              className="py-8 transition-opacity duration-300 starting:opacity-0 motion-reduce:transition-none"
              key={field.id}
            >
              {!information ? (
                <div className="mb-4">
                  {isGroupField(field) ? (
                    <div id={labelId} className={labelClass}>
                      {labelContent}
                    </div>
                  ) : (
                    <label id={labelId} htmlFor={inputId} className={labelClass}>
                      {labelContent}
                    </label>
                  )}
                  {field.description ? (
                    <p id={descriptionId} className={cn(questionnaireType.help, "mt-1.5")}>
                      {field.description}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div>
                <QuestionnaireFieldInput
                  field={field}
                  value={answers[field.id]}
                  error={error}
                  labelId={labelId}
                  descriptionId={descriptionId}
                  onChange={(value) => onAnswerChange(field.id, value)}
                />
                {error && error.target === "field" ? (
                  <QuestionnaireFieldError id={`${inputId}-error`} message={error.message} />
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
