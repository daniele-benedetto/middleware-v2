"use client";

import { QuestionnaireFieldError } from "@/components/public/questionnaires/questionnaire-field-error";
import { QuestionnaireFieldInput } from "@/components/public/questionnaires/questionnaire-field-input";
import { questionnaireHeadingId } from "@/components/public/questionnaires/questionnaire-ui";
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
  /** Visible fields of the step. */
  fields: QuestionnaireField[];
  answers: Record<string, unknown>;
  errors: Record<string, QuestionnaireAnswerError>;
  errorSummary: string | null;
  onAnswerChange: (id: string, value: unknown) => void;
}) {
  return (
    <section
      aria-labelledby={questionnaireHeadingId}
      className="border-t-[3px] border-accent bg-card p-5 sm:p-8"
    >
      <div className="border-b border-foreground pb-6">
        <h1
          id={questionnaireHeadingId}
          tabIndex={-1}
          className="font-heading text-[clamp(30px,4vw,48px)] leading-[0.94] font-black tracking-[-0.045em] text-foreground outline-none"
        >
          {step.title || i18n.public.questionnaire.defaultStepTitle}
        </h1>
        {step.description ? (
          <p className="mt-4 font-editorial text-[18px] leading-relaxed text-body-text">
            {step.description}
          </p>
        ) : null}
      </div>

      {errorSummary ? (
        <div
          role="alert"
          className="mt-6 border-l-[3px] border-accent bg-(--ui-error-bg) px-4 py-3 font-ui text-[11px] font-bold tracking-[0.06em] text-accent uppercase"
        >
          {errorSummary}
        </div>
      ) : null}

      <div className="divide-y divide-foreground">
        {fields.map((field) => {
          const error = errors[field.id];
          const inputId = `question-${field.id}`;
          const labelId = `${inputId}-label`;
          const descriptionId = field.description ? `${inputId}-description` : undefined;
          const information = field.type === "information";
          const labelClass = cn(
            "block font-heading text-[clamp(20px,2.4vw,27px)] leading-[1.05] font-black tracking-[-0.025em]",
            error ? "text-accent" : "text-foreground",
          );
          const labelContent = (
            <>
              {field.label}
              {field.required ? <span aria-hidden> *</span> : null}
            </>
          );

          return (
            <section className="py-7" key={field.id}>
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
                    <p
                      id={descriptionId}
                      className="mt-2 font-editorial text-[16px] leading-relaxed text-muted"
                    >
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
                {/* The error of the "Altro" text is rendered next to its input. */}
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
