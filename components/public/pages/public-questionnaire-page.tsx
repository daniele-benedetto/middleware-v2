"use client";

import { ArrowLeft, ArrowRight, Check, Clock3, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { PublicLink } from "@/components/public/public-link";
import { useQuestionnaireDraft } from "@/components/public/questionnaires/use-questionnaire-draft";
import { PublicRichText } from "@/components/public/rich-text";
import { PublicSystemScreen } from "@/components/public/system-screen";
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
type QuestionnairePhase = "intro" | "form" | "submitted" | "already-submitted";

const submitErrorMessage = "Non e stato possibile inviare il questionario. Riprova tra poco.";
const invalidAnswerMessage = "Controlla le risposte evidenziate e riprova.";

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
  if (issue.code === "invalid_type") return "Campo obbligatorio.";
  if (issue.code === "invalid_format") return "Inserisci un valore valido.";
  if (issue.code === "too_small") {
    if (issue.origin === "string" && typeof issue.minimum === "number") {
      return `Inserisci almeno ${issue.minimum} caratteri.`;
    }
    if (issue.origin === "array" && typeof issue.minimum === "number") {
      return `Seleziona almeno ${issue.minimum} opzioni.`;
    }
  }
  if (issue.code === "too_big" && typeof issue.maximum === "number") {
    return `Inserisci un valore non superiore a ${issue.maximum}.`;
  }
  return "Controlla il valore inserito.";
}

function getEstimatedMinutes(definition: QuestionnaireDefinition) {
  const fieldCount = definition.steps
    .flatMap((step) => step.fields)
    .filter((field) => field.type !== "information").length;
  return Math.max(1, Math.ceil(fieldCount / 5));
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

  if (field.type === "boolean" || field.type === "consent") {
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
        <span>{field.type === "boolean" ? field.trueLabel : field.consentText}</span>
      </label>
    );
  }

  if (field.type === "singleChoice" || field.type === "multipleChoice") {
    return (
      <div className="grid gap-2" aria-invalid={Boolean(error)} aria-describedby={describedBy}>
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
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground text-body-text hover:bg-surface-hover",
              )}
              key={option.id}
            >
              <input
                type={field.type === "multipleChoice" ? "checkbox" : "radio"}
                name={field.id}
                className="size-5 shrink-0 accent-accent"
                checked={selected}
                required={field.required && field.type === "singleChoice"}
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
      </div>
    );
  }

  if (field.type === "scale") {
    const options = [];
    for (let current = field.min; current <= field.max; current += field.step ?? 1)
      options.push(current);
    return (
      <div aria-invalid={Boolean(error)} aria-describedby={describedBy}>
        <div className="grid grid-flow-col auto-cols-fr border-l border-t border-foreground">
          {options.map((option) => (
            <label
              className={cn(
                "flex min-h-12 cursor-pointer items-center justify-center border-r border-b border-foreground font-ui text-sm font-bold",
                "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                value === option
                  ? "bg-foreground text-background"
                  : "bg-card text-foreground hover:bg-surface-hover",
              )}
              key={option}
            >
              <input
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
          <div className="mt-2 flex justify-between gap-4 font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
            <span>{field.minLabel}</span>
            <span className="text-right">{field.maxLabel}</span>
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
      step={"step" in field ? field.step : undefined}
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
  const nonInformationFields = step.fields.filter((field) => field.type !== "information");

  return (
    <fieldset className="border-t-[3px] border-accent bg-card p-5 sm:p-8">
      <legend className="sr-only">{step.title}</legend>
      <div className="border-b border-foreground pb-6">
        <p className="font-ui text-[11px] font-extrabold tracking-[0.12em] text-accent uppercase">
          Sezione
        </p>
        <h1
          id={titleId}
          tabIndex={-1}
          className="mt-3 font-heading text-[clamp(30px,4vw,48px)] leading-[0.94] font-black tracking-[-0.045em] text-foreground outline-none"
        >
          {step.title || "Domande"}
        </h1>
        {step.description ? (
          <p className="mt-4 font-editorial text-[18px] leading-relaxed text-body-text">
            {step.description}
          </p>
        ) : null}
        {nonInformationFields.some((field) => field.required) ? (
          <p className="mt-5 font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
            * Campo obbligatorio
          </p>
        ) : null}
      </div>

      {Object.keys(errors).length > 0 ? (
        <div
          role="alert"
          className="mt-6 border-l-[3px] border-accent bg-(--ui-error-bg) px-4 py-3 font-ui text-[11px] font-bold tracking-[0.06em] text-accent uppercase"
        >
          Completa o correggi i campi evidenziati per continuare.
        </div>
      ) : null}

      <div className="divide-y divide-foreground">
        {step.fields.map((field, index) => {
          const error = errors[field.id];
          const descriptionId = field.description ? `question-${field.id}-description` : undefined;
          const errorId = `question-${field.id}-error`;
          const information = field.type === "information";

          return (
            <section className="py-7" key={field.id}>
              {!information ? (
                <div className="mb-4 flex gap-3">
                  <span className="pt-1 font-ui text-[11px] font-black text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <label
                      htmlFor={`question-${field.id}`}
                      className={cn(
                        "font-heading text-[clamp(20px,2.4vw,27px)] leading-[1.05] font-black tracking-[-0.025em]",
                        error ? "text-accent" : "text-foreground",
                      )}
                    >
                      {field.label}
                      {field.required ? <span aria-hidden> *</span> : null}
                    </label>
                    {field.description ? (
                      <p
                        id={descriptionId}
                        className="mt-2 font-editorial text-[16px] leading-relaxed text-muted"
                      >
                        {field.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className={information ? "" : "pl-7 sm:pl-8"}>
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
        <div className="border-t-[3px] border-accent bg-card p-6 sm:p-10">
          <div
            className="flex size-13 items-center justify-center bg-foreground text-background"
            aria-hidden
          >
            {alreadySubmitted ? <Check className="size-7" /> : <Check className="size-7" />}
          </div>
          <p className="mt-8 font-ui text-[11px] font-extrabold tracking-[0.12em] text-accent uppercase">
            Questionario
          </p>
          <h1 className="mt-3 max-w-[14ch] font-heading text-[clamp(38px,6vw,68px)] leading-[0.88] font-black tracking-[-0.055em] text-foreground">
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
  const step = definition.steps[stepIndex];
  const isLastStep = stepIndex === definition.steps.length - 1;
  const estimatedMinutes = getEstimatedMinutes(definition);
  const completionHref = isSafeCompletionHref(definition.copy.completionCtaHref)
    ? definition.copy.completionCtaHref!
    : "/";
  const completionLabel = definition.copy.completionCtaLabel || "Torna alla rivista";

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
    }
    if (!restoreDraft) {
      draft.clear();
      setAnswers({});
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
      Object.values(errors).some((error) => error === "Campo obbligatorio.")
        ? definition.copy.requiredFieldsMessage
        : invalidAnswerMessage,
    );
    window.requestAnimationFrame(() => {
      const firstInvalidField = Object.keys(errors)[0];
      document.getElementById(`question-${firstInvalidField}`)?.focus();
      errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
      draft.clear();
      setPhase("submitted");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (isConflictError(error)) {
        draft.clear();
        setPhase("already-submitted");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setMessage(submitErrorMessage);
    }
  };

  if (questionnaire.isClosed) {
    return (
      <PublicSystemScreen
        code="—"
        kicker="Questionario"
        title={definition.copy.closedTitle}
        description={definition.copy.closedMessage}
        actions={
          <PublicLink
            href="/"
            className="font-heading text-xs font-bold tracking-[0.08em] text-accent uppercase hover:text-foreground"
          >
            Torna alla rivista
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

  if (phase === "intro") {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 bg-background py-10 focus:outline-none sm:py-16"
      >
        <section className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <div className="border-t-[3px] border-accent bg-card p-6 sm:p-10" data-page-reveal="body">
            <p className="font-ui text-[11px] font-extrabold tracking-[0.12em] text-accent uppercase">
              Questionario
            </p>
            <h1 className="mt-4 max-w-[13ch] font-heading text-[clamp(42px,7vw,82px)] leading-[0.86] font-black tracking-[-0.06em] text-foreground">
              {questionnaire.title}
            </h1>
            {questionnaire.descriptionRich ? (
              <PublicRichText value={questionnaire.descriptionRich} className="mt-8 max-w-[60ch]" />
            ) : null}
            {definition.copy.introduction ? (
              <p className="mt-7 max-w-[58ch] border-l-[3px] border-accent pl-5 font-editorial text-[18px] leading-relaxed text-body-text italic">
                {definition.copy.introduction}
              </p>
            ) : null}
            <div className="mt-10 grid border-l border-t border-foreground sm:grid-cols-3">
              <div className="border-r border-b border-foreground p-4">
                <p className="font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
                  Sezioni
                </p>
                <p className="mt-2 font-heading text-3xl leading-none font-black">
                  {String(definition.steps.length).padStart(2, "0")}
                </p>
              </div>
              <div className="border-r border-b border-foreground p-4">
                <p className="font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
                  Domande
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
                  Tempo stimato
                </p>
                <p className="mt-2 flex items-center gap-2 font-heading text-3xl leading-none font-black">
                  <Clock3 className="size-5 text-accent" aria-hidden />
                  {estimatedMinutes} min
                </p>
              </div>
            </div>
            {definition.copy.privacyNotice ? (
              <p className="mt-6 font-editorial text-[15px] leading-relaxed text-muted">
                {definition.copy.privacyNotice}
                {definition.copy.privacyUrl ? (
                  <>
                    {" "}
                    <a
                      href={definition.copy.privacyUrl}
                      className="font-heading text-[11px] font-bold text-foreground underline underline-offset-3"
                    >
                      Informativa privacy
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="inline-flex min-h-12 items-center gap-2 bg-foreground px-5 py-3 font-ui text-[12px] font-bold tracking-[0.08em] text-background uppercase transition-colors hover:bg-accent focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent"
                onClick={() => start(false)}
              >
                Inizia il questionario
                <ArrowRight className="size-4" aria-hidden />
              </button>
              {draft.isHydrated && draft.restoredAnswers ? (
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center gap-2 border border-foreground px-5 py-3 font-ui text-[12px] font-bold tracking-[0.08em] text-foreground uppercase transition-colors hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent"
                  onClick={() => start(true)}
                >
                  <RotateCcw className="size-4" aria-hidden />
                  Riprendi le risposte
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    );
  }

  const progress = ((stepIndex + 1) / definition.steps.length) * 100;
  const statusLabel =
    draft.status === "saving"
      ? "Salvataggio..."
      : draft.status === "saved"
        ? "Salvato sul dispositivo"
        : "Le risposte restano su questo dispositivo";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background focus:outline-none"
    >
      <header className="sticky top-0 z-40 bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 pt-3 sm:px-6 sm:pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-ui text-[10px] font-bold tracking-[0.1em] text-muted uppercase">
                {definition.copy.progressLabel}
              </p>
              <p className="mt-1 font-heading text-[15px] font-black">
                Sezione {stepIndex + 1} di {definition.steps.length}
              </p>
            </div>
            <p
              className="hidden font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase sm:block"
              aria-live="polite"
            >
              {statusLabel}
            </p>
          </div>
          <div className="mt-3 h-0.75 bg-foreground/15">
            <div
              className="h-full bg-accent transition-[width] duration-(--motion-base) ease-(--easing-standard)"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>
      <div ref={errorSummaryRef} className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <form
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
          <div className="sticky bottom-0 z-30 -mx-4 mt-8 flex items-center justify-between gap-4 border-t-2 border-foreground bg-background px-4 py-4 sm:-mx-6 sm:px-6">
            <button
              type="button"
              disabled={stepIndex === 0 || submit.isPending}
              className="inline-flex min-h-11 items-center gap-2 border border-foreground px-4 py-2.5 font-ui text-[11px] font-bold tracking-[0.08em] text-foreground uppercase transition-colors hover:bg-surface-hover disabled:border-border disabled:text-muted"
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
              className="inline-flex min-h-11 items-center gap-2 bg-foreground px-5 py-2.5 font-ui text-[11px] font-bold tracking-[0.08em] text-background uppercase transition-colors hover:bg-accent disabled:bg-muted"
              aria-describedby={`${pageId}-submit-status`}
            >
              {submit.isPending
                ? "Invio in corso..."
                : isLastStep
                  ? definition.copy.submitLabel
                  : definition.copy.nextLabel}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
          <p id={`${pageId}-submit-status`} className="sr-only" aria-live="polite">
            {submit.isPending ? "Invio del questionario in corso" : ""}
          </p>
        </form>
      </div>
    </main>
  );
}
