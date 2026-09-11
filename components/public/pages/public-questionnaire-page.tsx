"use client";

import { ArrowLeft, ArrowRight, Check, Clock3, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { PublicBrand } from "@/components/public/header/public-brand";
import { PublicLink } from "@/components/public/public-link";
import { useQuestionnaireDraft } from "@/components/public/questionnaires/use-questionnaire-draft";
import { PublicRichText } from "@/components/public/rich-text";
import { PublicSystemScreen } from "@/components/public/system-screen";
import { i18n } from "@/lib/i18n";
import { createQuestionnaireAnswersSchema } from "@/lib/server/modules/questionnaires/schema/definition";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { PublicQuestionnaireDto } from "@/lib/server/modules/questionnaires/dto/public";
import type {
  QuestionnaireDefinition,
  QuestionnaireField,
  QuestionnaireStep,
} from "@/lib/server/modules/questionnaires/schema";

type Answers = Record<string, unknown>;
type QuestionnairePhase = "intro" | "form" | "submitted" | "already-submitted" | "closed";

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function toIsoDateTimeValue(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function isConflictError(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return false;
  const data = error.data;
  return typeof data === "object" && data !== null && "code" in data && data.code === "CONFLICT";
}

function isClosedError(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return false;
  const data = error.data;
  if (!data || typeof data !== "object" || !("details" in data)) return false;
  const details = data.details;
  return (
    typeof details === "object" &&
    details !== null &&
    "reason" in details &&
    details.reason === "CLOSED"
  );
}

function normalizeAnswersForSubmission(definition: QuestionnaireDefinition, answers: Answers) {
  const normalized = { ...answers };

  for (const step of definition.steps) {
    for (const field of step.fields) {
      const value = normalized[field.id];
      if (field.type === "datetime" && typeof value === "string") {
        normalized[field.id] = toIsoDateTimeValue(value);
      }
    }
  }

  return normalized;
}

function validationMessage(issue: {
  code: string;
  origin?: unknown;
  minimum?: unknown;
  maximum?: unknown;
}) {
  if (issue.code === "invalid_type") return i18n.public.questionnaire.validation.required;
  if (issue.code === "invalid_format") return i18n.public.questionnaire.validation.invalidFormat;
  if (issue.code === "too_small") {
    if (issue.origin === "string" && typeof issue.minimum === "number") {
      return i18n.public.questionnaire.validation.minCharacters(issue.minimum);
    }
    if (issue.origin === "array" && typeof issue.minimum === "number") {
      return i18n.public.questionnaire.validation.minOptions(issue.minimum);
    }
  }
  if (issue.code === "too_big" && typeof issue.maximum === "number") {
    return i18n.public.questionnaire.validation.maxValue(issue.maximum);
  }
  return i18n.public.questionnaire.validation.invalidValue;
}

function getEstimatedMinutes(definition: QuestionnaireDefinition) {
  const fieldCount = definition.steps
    .flatMap((step) => step.fields)
    .filter((field) => field.type !== "information").length;
  return Math.max(1, Math.ceil(fieldCount / 5));
}

function getFirstIncompleteStepIndex(definition: QuestionnaireDefinition, answers: Answers) {
  const incompleteIndex = definition.steps.findIndex((step) => {
    const stepDefinition = { ...definition, steps: [step] };
    const stepAnswers = Object.fromEntries(
      step.fields
        .filter((field) => field.type !== "information")
        .map((field) => [field.id, answers[field.id]]),
    );

    return !createQuestionnaireAnswersSchema(stepDefinition).safeParse(
      normalizeAnswersForSubmission(stepDefinition, stepAnswers),
    ).success;
  });

  return incompleteIndex === -1 ? definition.steps.length - 1 : incompleteIndex;
}

function isSafeCompletionHref(value: string | undefined) {
  if (!value) return false;
  return value.startsWith("/") || /^https?:\/\//.test(value);
}

function FieldInput({
  field,
  value,
  error,
  descriptionId,
  onChange,
}: {
  field: QuestionnaireField;
  value: unknown;
  error?: string;
  descriptionId?: string;
  onChange: (value: unknown) => void;
}) {
  const inputId = `question-${field.id}`;
  const errorId = `${inputId}-error`;
  const describedBy =
    [descriptionId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;
  const inputClass = cn(
    "w-full rounded-none border bg-card px-4 py-3 font-editorial text-[18px] leading-normal text-body-text outline-none transition-colors",
    "placeholder:text-muted focus:border-2 focus:border-accent focus:px-3.75 focus:py-2.75",
    error ? "border-2 border-accent px-3.75 py-2.75" : "border-foreground",
  );

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
      <fieldset aria-describedby={describedBy} aria-invalid={Boolean(error)} className="grid gap-2">
        <legend className="sr-only">{field.label}</legend>
        {[
          { value: true, label: field.trueLabel },
          { value: false, label: field.falseLabel },
        ].map((option) => (
          <label
            key={String(option.value)}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 border bg-card px-4 py-3 font-editorial text-[17px] leading-snug has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
              value === option.value
                ? "border-foreground bg-surface-hover text-body-text"
                : "border-foreground text-body-text",
            )}
          >
            <input
              id={`${inputId}-${option.value}`}
              type="radio"
              name={field.id}
              checked={value === option.value}
              required={field.required}
              aria-describedby={describedBy}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    );
  }

  if (field.type === "consent") {
    return (
      <label className="flex cursor-pointer items-start gap-3 border border-foreground bg-card p-4 font-editorial text-[17px] leading-snug text-body-text has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
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
    );
  }

  if (field.type === "singleChoice" || field.type === "multipleChoice") {
    return (
      <fieldset className="grid gap-2" aria-describedby={describedBy} aria-invalid={Boolean(error)}>
        <legend className="sr-only">{field.label}</legend>
        {field.options.map((option) => {
          const selected =
            field.type === "multipleChoice"
              ? Array.isArray(value) && value.includes(option.id)
              : value === option.id;
          return (
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 border bg-card px-4 py-3 font-editorial text-[18px] leading-snug transition-colors",
                "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                selected
                  ? "border-foreground bg-surface-hover text-body-text"
                  : "border-foreground text-body-text hover:bg-surface-hover",
              )}
              key={option.id}
            >
              <input
                id={`${inputId}-${option.id}`}
                type={field.type === "multipleChoice" ? "checkbox" : "radio"}
                name={field.id}
                className="size-5 shrink-0 accent-accent"
                checked={selected}
                required={field.required && field.type === "singleChoice"}
                aria-describedby={describedBy}
                onChange={(event) => {
                  if (field.type === "singleChoice") {
                    onChange(option.id);
                    return;
                  }
                  const selectedValues = Array.isArray(value)
                    ? value.filter((item): item is string => typeof item === "string")
                    : [];
                  onChange(
                    event.target.checked
                      ? [...selectedValues, option.id]
                      : selectedValues.filter((item) => item !== option.id),
                  );
                }}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </fieldset>
    );
  }

  if (field.type === "scale") {
    const options = [];
    for (let current = field.min; current <= field.max; current += field.step ?? 1)
      options.push(current);
    return (
      <fieldset aria-describedby={describedBy} aria-invalid={Boolean(error)}>
        <legend className="sr-only">{field.label}</legend>
        <div className="grid grid-flow-col auto-cols-fr border-l border-t border-foreground">
          {options.map((option) => (
            <label
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-center border-r border-b border-foreground font-ui text-sm font-bold",
                "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                value === option
                  ? "bg-surface-hover text-foreground"
                  : "bg-card text-foreground hover:bg-surface-hover",
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
                aria-describedby={describedBy}
                onChange={() => onChange(option)}
              />
              {option}
            </label>
          ))}
        </div>
        {field.minLabel || field.maxLabel ? (
          <div className="mt-2 flex justify-between gap-4 font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
            <span>{field.minLabel}</span>
            <span className="text-right">{field.maxLabel}</span>
          </div>
        ) : null}
      </fieldset>
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

function QuestionnaireStepForm({
  step,
  answers,
  errors,
  onAnswerChange,
}: {
  step: QuestionnaireStep;
  answers: Answers;
  errors: Record<string, string>;
  onAnswerChange: (id: string, value: unknown) => void;
}) {
  const titleId = "questionnaire-step-title";

  return (
    <fieldset className="border-t-[3px] border-accent bg-card p-5 sm:p-8">
      <legend className="sr-only">{step.title}</legend>
      <div className="border-b border-foreground pb-6">
        <h1
          id={titleId}
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

      {Object.keys(errors).length > 0 ? (
        <div
          role="alert"
          className="mt-6 border-l-[3px] border-accent bg-(--ui-error-bg) px-4 py-3 font-ui text-[11px] font-bold tracking-[0.06em] text-accent uppercase"
        >
          {i18n.public.questionnaire.validation.summary}
        </div>
      ) : null}

      <div className="divide-y divide-foreground">
        {step.fields.map((field) => {
          const error = errors[field.id];
          const descriptionId = field.description ? `question-${field.id}-description` : undefined;
          const errorId = `question-${field.id}-error`;
          const information = field.type === "information";

          return (
            <section className="py-7" key={field.id}>
              {!information ? (
                <div className="mb-4">
                  <div
                    className={cn(
                      "font-heading text-[clamp(20px,2.4vw,27px)] leading-[1.05] font-black tracking-[-0.025em]",
                      error ? "text-accent" : "text-foreground",
                    )}
                  >
                    {field.label}
                    {field.required ? <span aria-hidden> *</span> : null}
                  </div>
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
                <FieldInput
                  field={field}
                  value={answers[field.id]}
                  error={error}
                  descriptionId={descriptionId}
                  onChange={(value) => onAnswerChange(field.id, value)}
                />
                {error ? (
                  <p
                    id={errorId}
                    className="mt-3 font-ui text-[11px] font-bold tracking-[0.06em] text-accent uppercase"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </fieldset>
  );
}

function QuestionnaireFinishScreen({
  title,
  message,
  actionLabel,
  actionHref,
  alreadySubmitted = false,
}: {
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  alreadySubmitted?: boolean;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 items-center bg-background py-14 focus:outline-none sm:py-20"
    >
      <section className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="mb-6">
          <PublicBrand eager />
        </div>
        <div className="border-t-[3px] border-accent bg-card p-6 sm:p-10">
          <div
            className="flex size-13 items-center justify-center bg-foreground text-background"
            aria-hidden
          >
            {alreadySubmitted ? <Check className="size-7" /> : <Check className="size-7" />}
          </div>
          <h1 className="mt-8 max-w-[14ch] font-heading text-[clamp(38px,6vw,68px)] leading-[0.88] font-black tracking-[-0.055em] text-foreground">
            {title}
          </h1>
          <p className="mt-6 max-w-[52ch] font-editorial text-[20px] leading-relaxed text-body-text">
            {message}
          </p>
          <PublicLink
            href={actionHref}
            className="mt-9 inline-flex items-center gap-2 bg-foreground px-5 py-3 font-ui text-[12px] font-bold tracking-[0.08em] text-background uppercase transition-colors hover:bg-accent focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent"
          >
            {actionLabel}
            <ArrowRight className="size-4" aria-hidden />
          </PublicLink>
        </div>
      </section>
    </main>
  );
}

export function PublicQuestionnairePage({
  questionnaire,
}: {
  questionnaire: PublicQuestionnaireDto;
}) {
  const { definition } = questionnaire;
  const [phase, setPhase] = useState<QuestionnairePhase>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const pageId = useId();
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const submit = trpc.public.questionnaires.submit.useMutation();
  const draft = useQuestionnaireDraft(questionnaire.id, definition.version);
  const responderStatus = trpc.public.questionnaires.status.useQuery(
    { questionnaireId: questionnaire.id },
    { enabled: !questionnaire.isClosed, staleTime: Number.POSITIVE_INFINITY },
  );
  const step = definition.steps[stepIndex];
  const isLastStep = stepIndex === definition.steps.length - 1;
  const estimatedMinutes = getEstimatedMinutes(definition);
  const completionHref = isSafeCompletionHref(definition.copy.completionCtaHref)
    ? definition.copy.completionCtaHref!
    : "/";
  const completionLabel =
    definition.copy.completionCtaLabel || i18n.public.questionnaire.defaultCompletionCta;

  useEffect(() => {
    if (phase !== "form") return;
    document.getElementById("questionnaire-step-title")?.focus();
  }, [phase, stepIndex]);

  const updateAnswer = (id: string, value: unknown) => {
    setAnswers((current) => {
      const next = { ...current, [id]: value };
      draft.persist(next);
      return next;
    });
    setFieldErrors((current) => {
      if (!current[id]) return current;
      const { [id]: _error, ...next } = current;
      return next;
    });
    setMessage(null);
  };

  const start = (restoreDraft: boolean) => {
    if (restoreDraft && draft.restoredAnswers) {
      setAnswers(draft.restoredAnswers);
      setStepIndex(getFirstIncompleteStepIndex(definition, draft.restoredAnswers));
    }
    if (!restoreDraft) {
      draft.clear();
      setAnswers({});
      setStepIndex(0);
    }
    setFieldErrors({});
    setMessage(null);
    setPhase("form");
  };

  const validateStep = () => {
    const stepDefinition = { ...definition, steps: [step] };
    const stepAnswers = Object.fromEntries(
      step.fields
        .filter((field) => field.type !== "information")
        .map((field) => [field.id, answers[field.id]]),
    );
    const result = createQuestionnaireAnswersSchema(stepDefinition).safeParse(
      normalizeAnswersForSubmission(stepDefinition, stepAnswers),
    );

    if (result.success) {
      setFieldErrors({});
      setMessage(null);
      return true;
    }

    const errors = result.error.issues.reduce<Record<string, string>>((current, issue) => {
      const fieldId = typeof issue.path[0] === "string" ? issue.path[0] : null;
      if (fieldId && !current[fieldId]) current[fieldId] = validationMessage(issue);
      return current;
    }, {});
    setFieldErrors(errors);
    setMessage(
      Object.values(errors).some((error) => error === i18n.public.questionnaire.validation.required)
        ? definition.copy.requiredFieldsMessage
        : i18n.public.questionnaire.invalidAnswer,
    );
    window.requestAnimationFrame(() => {
      const firstInvalidField = Object.keys(errors)[0];
      const target =
        document.getElementById(`question-${firstInvalidField}`) ??
        document.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`);
      target?.focus();
      target?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
    });
    return false;
  };

  const next = async () => {
    if (!validateStep()) return;
    if (!isLastStep) {
      setStepIndex((value) => value + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      await submit.mutateAsync({
        questionnaireId: questionnaire.id,
        answers: normalizeAnswersForSubmission(definition, answers),
      });
      setPhase("submitted");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (isClosedError(error)) {
        setPhase("closed");
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }
      if (isConflictError(error)) {
        setPhase("already-submitted");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setMessage(i18n.public.questionnaire.submitError);
    }
  };

  if (questionnaire.isClosed || phase === "closed") {
    return (
      <PublicSystemScreen
        code="404"
        title={definition.copy.closedTitle}
        description={definition.copy.closedMessage}
        actions={
          <PublicLink
            href="/"
            className="font-heading text-xs font-bold tracking-[0.08em] text-accent uppercase hover:text-foreground"
          >
            {i18n.public.questionnaire.closedCta}
          </PublicLink>
        }
      />
    );
  }

  if (phase === "submitted") {
    return (
      <QuestionnaireFinishScreen
        title={definition.copy.successTitle}
        message={definition.copy.successMessage}
        actionLabel={completionLabel}
        actionHref={completionHref}
      />
    );
  }

  if (phase === "already-submitted") {
    return (
      <QuestionnaireFinishScreen
        title={definition.copy.alreadySubmittedTitle}
        message={definition.copy.alreadySubmittedMessage}
        actionLabel={completionLabel}
        actionHref={completionHref}
        alreadySubmitted
      />
    );
  }

  if (responderStatus.data?.hasResponded) {
    return (
      <QuestionnaireFinishScreen
        title={definition.copy.alreadySubmittedTitle}
        message={definition.copy.alreadySubmittedMessage}
        actionLabel={completionLabel}
        actionHref={completionHref}
        alreadySubmitted
      />
    );
  }

  if (phase === "intro") {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 bg-background py-10 focus:outline-none sm:py-16"
      >
        <section className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <div className="mb-6">
            <PublicBrand eager />
          </div>
          <div className="border-t-[3px] border-accent bg-card p-6 sm:p-10" data-page-reveal="body">
            <h1 className="max-w-[13ch] font-heading text-[clamp(42px,7vw,82px)] leading-[0.86] font-black tracking-[-0.06em] text-foreground">
              {questionnaire.title}
            </h1>
            {questionnaire.descriptionRich ? (
              <PublicRichText value={questionnaire.descriptionRich} className="mt-8 max-w-[60ch]" />
            ) : null}
            <div className="mt-10 grid border-l border-t border-foreground sm:grid-cols-3">
              <div className="border-r border-b border-foreground p-4">
                <p className="font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
                  {i18n.public.questionnaire.stats.stepsLabel}
                </p>
                <p className="mt-2 font-heading text-3xl leading-none font-black">
                  {String(definition.steps.length).padStart(2, "0")}
                </p>
              </div>
              <div className="border-r border-b border-foreground p-4">
                <p className="font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
                  {i18n.public.questionnaire.stats.questionsLabel}
                </p>
                <p className="mt-2 font-heading text-3xl leading-none font-black">
                  {String(
                    definition.steps
                      .flatMap((current) => current.fields)
                      .filter((field) => field.type !== "information").length,
                  ).padStart(2, "0")}
                </p>
              </div>
              <div className="border-r border-b border-foreground p-4">
                <p className="font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
                  {i18n.public.questionnaire.stats.estimatedTimeLabel}
                </p>
                <p className="mt-2 flex items-center gap-2 font-heading text-3xl leading-none font-black">
                  <Clock3 className="size-5 text-accent" aria-hidden />
                  {estimatedMinutes} {i18n.public.questionnaire.stats.minutes}
                </p>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              {draft.isHydrated && draft.restoredAnswers ? (
                <>
                  <button
                    type="button"
                    className="inline-flex min-h-12 items-center gap-2 bg-foreground px-5 py-3 font-ui text-[12px] font-bold tracking-[0.08em] text-background uppercase transition-colors hover:bg-accent focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent"
                    onClick={() => start(true)}
                  >
                    <RotateCcw className="size-4" aria-hidden />
                    {i18n.public.questionnaire.resumeCta}
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-12 items-center gap-2 border border-foreground px-5 py-3 font-ui text-[12px] font-bold tracking-[0.08em] text-foreground uppercase transition-colors hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent"
                    onClick={() => start(false)}
                  >
                    {i18n.public.questionnaire.restartCta}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center gap-2 bg-foreground px-5 py-3 font-ui text-[12px] font-bold tracking-[0.08em] text-background uppercase transition-colors hover:bg-accent focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent"
                  onClick={() => start(false)}
                >
                  {i18n.public.questionnaire.startCta}
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  const progress = ((stepIndex + 1) / definition.steps.length) * 100;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background focus:outline-none"
    >
      <header className="sticky top-0 z-40 bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 pt-3 sm:px-6 sm:pt-5">
          <div className="flex items-center justify-between gap-4">
            <PublicBrand eager />
            <p className="font-heading text-[15px] font-black">
              {i18n.public.questionnaire.progressLabel(stepIndex + 1, definition.steps.length)}
            </p>
          </div>
          <div
            aria-label={i18n.public.questionnaire.progressLabel(
              stepIndex + 1,
              definition.steps.length,
            )}
            aria-valuemax={definition.steps.length}
            aria-valuemin={1}
            aria-valuenow={stepIndex + 1}
            aria-valuetext={i18n.public.questionnaire.progressLabel(
              stepIndex + 1,
              definition.steps.length,
            )}
            className="mt-3 h-0.75 bg-foreground/15"
            role="progressbar"
          >
            <div
              className="h-full bg-accent transition-[width] duration-(--motion-base) ease-(--easing-standard)"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>
      <div ref={errorSummaryRef} className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void next();
          }}
        >
          <QuestionnaireStepForm
            step={step}
            answers={answers}
            errors={fieldErrors}
            onAnswerChange={updateAnswer}
          />
          {message ? (
            <p
              role="alert"
              className="mt-5 border-l-[3px] border-accent bg-(--ui-error-bg) px-4 py-3 font-ui text-[11px] font-bold tracking-[0.06em] text-accent uppercase"
            >
              {message}
            </p>
          ) : null}
          <div className="sticky bottom-0 z-30 -mx-4 mt-8 flex flex-col-reverse gap-3 border-t-2 border-foreground bg-background px-4 py-4 sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
            <button
              type="button"
              disabled={stepIndex === 0 || submit.isPending}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-foreground px-4 py-2.5 font-ui text-[11px] font-bold tracking-[0.08em] text-foreground uppercase transition-colors hover:bg-surface-hover disabled:border-border disabled:text-muted sm:w-auto"
              onClick={() => {
                setStepIndex((value) => value - 1);
                setFieldErrors({});
                setMessage(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <ArrowLeft className="size-4" aria-hidden />
              {definition.copy.backLabel}
            </button>
            <button
              type="submit"
              disabled={submit.isPending}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-foreground px-5 py-2.5 font-ui text-[11px] font-bold tracking-[0.08em] text-background uppercase transition-colors hover:bg-accent disabled:bg-muted sm:w-auto"
              aria-describedby={`${pageId}-submit-status`}
            >
              {submit.isPending
                ? i18n.public.questionnaire.submitting
                : isLastStep
                  ? definition.copy.submitLabel
                  : definition.copy.nextLabel}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
          <p id={`${pageId}-submit-status`} className="sr-only" aria-live="polite">
            {submit.isPending ? i18n.public.questionnaire.submittingStatus : ""}
          </p>
        </form>
      </div>
    </main>
  );
}
