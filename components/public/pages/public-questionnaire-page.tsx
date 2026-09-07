"use client";

import { startTransition, useEffect, useState } from "react";

import { useQuestionnaireDraft } from "@/components/public/questionnaires/use-questionnaire-draft";
import { PublicRichText } from "@/components/public/rich-text";
import { trpc } from "@/lib/trpc/react";

import type { PublicQuestionnaireDto } from "@/lib/server/modules/questionnaires/dto/public";
import type { QuestionnaireField } from "@/lib/server/modules/questionnaires/schema";

type Answers = Record<string, unknown>;

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: QuestionnaireField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const baseClass =
    "w-full border border-foreground bg-background px-3 py-2 font-editorial text-base outline-none focus:border-2 focus:border-accent";
  if (field.type === "information")
    return (
      <p className="font-editorial text-lg leading-relaxed text-body-text">
        {field.description ?? field.label}
      </p>
    );
  if (field.type === "textarea")
    return (
      <textarea
        className={`${baseClass} min-h-32`}
        value={typeof value === "string" ? value : ""}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  if (field.type === "boolean" || field.type === "consent")
    return (
      <label className="flex items-center gap-3 font-ui text-sm font-bold uppercase tracking-[.06em]">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
        {field.type === "boolean" ? field.trueLabel : field.consentText}
      </label>
    );
  if (field.type === "singleChoice" || field.type === "multipleChoice")
    return (
      <div className="space-y-3">
        {field.options.map((option) => {
          const selected =
            field.type === "multipleChoice"
              ? Array.isArray(value) && value.includes(option.id)
              : value === option.id;
          return (
            <label className="flex items-center gap-3 font-editorial text-lg" key={option.id}>
              <input
                type={field.type === "multipleChoice" ? "checkbox" : "radio"}
                name={field.id}
                checked={selected}
                onChange={(event) => {
                  if (field.type === "singleChoice") onChange(option.id);
                  else {
                    const selectedValues = Array.isArray(value)
                      ? value.filter((item): item is string => typeof item === "string")
                      : [];
                    onChange(
                      event.target.checked
                        ? [...selectedValues, option.id]
                        : selectedValues.filter((item) => item !== option.id),
                    );
                  }
                }}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    );
  if (field.type === "scale") {
    const options = [];
    for (let current = field.min; current <= field.max; current += field.step ?? 1)
      options.push(current);
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            className="flex size-10 items-center justify-center border border-foreground font-ui text-sm font-bold"
            key={option}
          >
            <input
              className="sr-only"
              type="radio"
              name={field.id}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {option}
          </label>
        ))}
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
            : field.type === "url"
              ? "url"
              : "text";
  return (
    <input
      className={baseClass}
      type={type}
      value={typeof value === "string" || typeof value === "number" ? value : ""}
      placeholder={"placeholder" in field ? field.placeholder : undefined}
      min={"min" in field && typeof field.min !== "number" ? field.min : undefined}
      max={"max" in field && typeof field.max !== "number" ? field.max : undefined}
      step={"step" in field ? field.step : undefined}
      onChange={(event) =>
        onChange(
          field.type === "integer" || field.type === "decimal"
            ? event.target.value === ""
              ? undefined
              : Number(event.target.value)
            : event.target.value,
        )
      }
    />
  );
}

export function PublicQuestionnairePage({
  questionnaire,
}: {
  questionnaire: PublicQuestionnaireDto;
}) {
  const { definition } = questionnaire;
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [message, setMessage] = useState<string | null>(null);
  const submit = trpc.public.questionnaires.submit.useMutation();
  const draft = useQuestionnaireDraft(questionnaire.id, definition.version);
  const step = definition.steps[stepIndex];
  const isLastStep = stepIndex === definition.steps.length - 1;
  useEffect(() => {
    if (!draft.restoredAnswers) return;
    startTransition(() => {
      setAnswers(draft.restoredAnswers!);
      setMessage(definition.copy.resumeMessage);
    });
  }, [definition.copy.resumeMessage, draft.restoredAnswers]);
  const updateAnswer = (id: string, value: unknown) =>
    setAnswers((current) => {
      const next = { ...current, [id]: value };
      draft.persist(next);
      return next;
    });
  const validateStep = () => {
    const missing = step.fields.some((field) => {
      const answer = answers[field.id];
      return (
        field.required &&
        field.type !== "information" &&
        (answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0))
      );
    });
    if (missing) {
      setMessage(definition.copy.requiredFieldsMessage);
      return false;
    }
    setMessage(null);
    return true;
  };
  const next = async () => {
    if (!validateStep()) return;
    if (!isLastStep) {
      setStepIndex((value) => value + 1);
      return;
    }
    try {
      await submit.mutateAsync({ questionnaireId: questionnaire.id, answers });
      draft.clear();
      setMessage(definition.copy.successMessage);
    } catch {
      setMessage(definition.copy.alreadySubmittedMessage);
    }
  };

  if (questionnaire.isClosed)
    return (
      <main id="main-content" className="mx-auto w-full max-w-3xl px-5 py-16">
        <h1 className="font-display text-4xl font-black">{definition.copy.closedTitle}</h1>
        <p className="mt-4 font-editorial text-xl">{definition.copy.closedMessage}</p>
      </main>
    );
  if (message === definition.copy.successMessage)
    return (
      <main id="main-content" className="mx-auto w-full max-w-3xl px-5 py-16">
        <h1 className="font-display text-4xl font-black">{definition.copy.successTitle}</h1>
        <p className="mt-4 font-editorial text-xl">{message}</p>
      </main>
    );
  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-5 py-16">
      <p className="font-ui text-xs font-bold uppercase tracking-[.08em]">
        {definition.copy.progressLabel} {stepIndex + 1}/{definition.steps.length}
      </p>
      <h1 className="mt-4 font-display text-4xl font-black leading-none md:text-6xl">
        {questionnaire.title}
      </h1>
      {questionnaire.descriptionRich ? (
        <PublicRichText value={questionnaire.descriptionRich} className="mt-6" />
      ) : null}
      <form
        className="mt-12 space-y-8"
        onSubmit={(event) => {
          event.preventDefault();
          void next();
        }}
      >
        <fieldset className="space-y-8">
          <legend className="font-display text-2xl font-black">{step.title}</legend>
          {step.description ? <p className="font-editorial text-lg">{step.description}</p> : null}
          {step.fields.map((field) => (
            <div className="space-y-3 border-t border-foreground pt-5" key={field.id}>
              <label className="block font-ui text-xs font-bold uppercase tracking-[.08em]">
                {field.label}
                {field.required ? " *" : ""}
              </label>
              {field.description ? (
                <p className="font-editorial text-base">{field.description}</p>
              ) : null}
              <FieldInput
                field={field}
                value={answers[field.id]}
                onChange={(value) => updateAnswer(field.id, value)}
              />
            </div>
          ))}
        </fieldset>
        {message ? (
          <p role="alert" className="font-ui text-sm font-bold text-accent">
            {message}
          </p>
        ) : null}
        <div className="flex justify-between gap-3">
          <button
            className="border border-foreground px-4 py-3 font-ui text-xs font-bold uppercase disabled:opacity-40"
            type="button"
            disabled={stepIndex === 0 || submit.isPending}
            onClick={() => setStepIndex((value) => value - 1)}
          >
            {definition.copy.backLabel}
          </button>
          <button
            className="bg-foreground px-4 py-3 font-ui text-xs font-bold uppercase text-background disabled:opacity-40"
            type="submit"
            disabled={submit.isPending}
          >
            {isLastStep ? definition.copy.submitLabel : definition.copy.nextLabel}
          </button>
        </div>
      </form>
    </main>
  );
}
