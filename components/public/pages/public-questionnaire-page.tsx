"use client";

import { useEffect, useId, useRef, useState } from "react";

import { PublicLink } from "@/components/public/public-link";
import { focusNextControlOnEnter } from "@/components/public/questionnaires/focus-next-control";
import { QuestionnaireFlowActions } from "@/components/public/questionnaires/questionnaire-flow-actions";
import { QuestionnaireIntro } from "@/components/public/questionnaires/questionnaire-intro";
import { QuestionnaireProgressHeader } from "@/components/public/questionnaires/questionnaire-progress-header";
import { QuestionnaireReview } from "@/components/public/questionnaires/questionnaire-review";
import { QuestionnaireStepForm } from "@/components/public/questionnaires/questionnaire-step-form";
import {
  isSafeHref,
  questionnaireColumnClass,
  questionnaireHeadingId,
} from "@/components/public/questionnaires/questionnaire-ui";
import { useQuestionnaireDraft } from "@/components/public/questionnaires/use-questionnaire-draft";
import {
  questionnaireHistory,
  useQuestionnaireHistoryTraversal,
} from "@/components/public/questionnaires/use-questionnaire-history";
import { getQuestionnaireResultsPath } from "@/components/public/sections/questionnaires/analysis-format";
import { PublicSystemActionLink, PublicSystemScreen } from "@/components/public/system-screen";
import { i18n } from "@/lib/i18n";
import {
  getFirstInvalidStepIndex,
  getQuestionnaireProgress,
  getQuestionnaireReviewSections,
  getResumeStop,
  getStepAnswerErrors,
  getVisibleQuestionnaireSteps,
  normalizeAnswersForSubmission,
} from "@/lib/questionnaires/flow";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { QuestionnaireResponderStatus } from "@/lib/public/server/questionnaire-responder";
import type {
  QuestionnaireAnswerError,
  QuestionnaireAnswerValues,
  QuestionnaireDraftSnapshot,
  QuestionnaireFlowStop,
} from "@/lib/questionnaires/flow";
import type { PublicQuestionnaireDto } from "@/lib/server/modules/questionnaires/dto/public";

type QuestionnairePhase = "intro" | "form" | "submitted" | "already-submitted" | "closed";
type FieldErrors = Record<string, QuestionnaireAnswerError>;

function getTrpcErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return null;
  const data = error.data;
  if (typeof data !== "object" || data === null || !("code" in data)) return null;
  return typeof data.code === "string" ? data.code : null;
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

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PublicQuestionnairePage({
  questionnaire,
  responder,
}: {
  questionnaire: PublicQuestionnaireDto;
  /** Whether the visitor already answered, resolved on the server. */
  responder: QuestionnaireResponderStatus;
}) {
  const { definition } = questionnaire;
  const text = i18n.public.questionnaire;
  const [phase, setPhase] = useState<QuestionnairePhase>("intro");
  const [stop, setStop] = useState<QuestionnaireFlowStop>(0);
  // True while a step is open from the review ("Modifica"): the primary action returns there.
  const [editing, setEditing] = useState(false);
  // True once the form has been opened in this visit: the answers in memory win over the draft.
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<QuestionnaireAnswerValues>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const pageId = useId();
  const draftDiscarded = useRef(false);
  // Set as soon as the questionnaire ends: later history traversals must not reopen the form.
  const finished = useRef(false);
  const submit = trpc.public.questionnaires.submit.useMutation();
  const draft = useQuestionnaireDraft(questionnaire.id, definition.version);
  const { clear: clearDraft, isHydrated: isDraftHydrated } = draft;
  const responderStatus = trpc.public.questionnaires.status.useQuery(
    { questionnaireId: questionnaire.id },
    {
      enabled: !questionnaire.isClosed,
      // The server already answered: no request, and the right screen from the first paint.
      // When it could not tell (no cookie on the page request) the API is asked once.
      initialData: { hasResponded: responder.hasResponded },
      staleTime: responder.isKnown ? Number.POSITIVE_INFINITY : 0,
    },
  );
  const hasResponded = responderStatus.data?.hasResponded === true;

  // Steps without visible fields are not part of the flow: they are skipped in both directions.
  const visibleSteps = getVisibleQuestionnaireSteps(definition, answers);
  const position =
    stop === "review" ? -1 : visibleSteps.findIndex(({ stepIndex }) => stepIndex === stop);
  const currentStep = position === -1 ? null : visibleSteps[position];
  const previousStep = currentStep ? visibleSteps[position - 1] : visibleSteps.at(-1);

  const completionHref = isSafeHref(definition.copy.completionCtaHref)
    ? definition.copy.completionCtaHref
    : "/";
  const completionLabel = definition.copy.completionCtaLabel || text.defaultCompletionCta;
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const errorSummary = !hasFieldErrors
    ? null
    : Object.values(fieldErrors).some((error) => error.message === text.validation.required)
      ? definition.copy.requiredFieldsMessage || text.validation.summary
      : text.validation.summary;

  const toDraftStepIndex = (target: QuestionnaireFlowStop) =>
    target === "review" ? definition.steps.length : target;

  // Every move (buttons or browser history) lands on the heading of the new stop.
  useEffect(() => {
    if (phase !== "form") return;
    document.getElementById(questionnaireHeadingId)?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [phase, stop]);

  // A questionnaire that can no longer be answered must not leave answers on the device.
  const shouldDiscardDraft = questionnaire.isClosed || hasResponded;
  useEffect(() => {
    if (!shouldDiscardDraft || !isDraftHydrated || draftDiscarded.current) return;
    draftDiscarded.current = true;
    clearDraft();
  }, [shouldDiscardDraft, isDraftHydrated, clearDraft]);

  const showStop = (target: QuestionnaireFlowStop, nextEditing: boolean) => {
    setStop(target);
    setEditing(nextEditing && target !== "review");
    setPhase("form");
    setFieldErrors({});
    setSubmitError(null);
  };

  /** Opens `target` as a new history entry. */
  const goTo = (target: QuestionnaireFlowStop, nextEditing = false) => {
    questionnaireHistory.push(target, nextEditing);
    showStop(target, nextEditing);
    draft.persist(answers, toDraftStepIndex(target));
  };

  /**
   * Opens `target` as a step back: through the browser history when the previous entry is that
   * stop (the traversal handler shows it), otherwise in place of the current entry.
   */
  const goBackTo = (target: QuestionnaireFlowStop, nextEditing = false) => {
    if (questionnaireHistory.isPrevious(target)) {
      questionnaireHistory.back();
      return;
    }
    questionnaireHistory.replace(target, nextEditing);
    showStop(target, nextEditing);
    draft.persist(answers, toDraftStepIndex(target));
  };

  useQuestionnaireHistoryTraversal((entry) => {
    if (finished.current) return;
    if (!started || !entry || entry.stop === "intro") {
      setPhase("intro");
      return;
    }
    // The entry may point to a step that is now hidden or beyond an incomplete one.
    const target = getResumeStop(definition, {
      answers,
      stepIndex: toDraftStepIndex(entry.stop),
    });
    const nextEditing = entry.editing && target !== "review";
    if (target !== entry.stop) questionnaireHistory.replace(target, nextEditing);
    showStop(target, nextEditing);
    draft.persist(answers, toDraftStepIndex(target));
  });

  const updateAnswer = (id: string, value: unknown) => {
    const nextAnswers = { ...answers, [id]: value };
    setAnswers(nextAnswers);
    draft.persist(nextAnswers, toDraftStepIndex(stop));
    setFieldErrors((current) => {
      if (!current[id]) return current;
      const { [id]: _error, ...rest } = current;
      return rest;
    });
    setSubmitError(null);
  };

  const start = (restoreDraft: boolean) => {
    const emptySnapshot: QuestionnaireDraftSnapshot = { answers: {}, stepIndex: 0 };
    const snapshot = !restoreDraft
      ? emptySnapshot
      : started
        ? { answers, stepIndex: toDraftStepIndex(stop) }
        : (draft.restoredDraft ?? emptySnapshot);
    if (!restoreDraft) draft.clear();

    const target = getResumeStop(definition, snapshot);
    setAnswers(snapshot.answers);
    setStarted(true);
    questionnaireHistory.push(target);
    showStop(target, false);
  };

  const focusFirstInvalidField = (errors: FieldErrors) => {
    const firstInvalidField = currentStep?.fields.find((field) => errors[field.id]);
    if (!firstInvalidField) return;
    const inputId = `question-${firstInvalidField.id}`;
    const targetId =
      errors[firstInvalidField.id].target === "other" ? `${inputId}-other-text` : inputId;
    window.requestAnimationFrame(() => {
      const target =
        document.getElementById(targetId) ??
        document.querySelector<HTMLElement>(`[name="${firstInvalidField.id}"]`);
      target?.focus();
      target?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "center",
      });
    });
  };

  const validateCurrentStep = () => {
    if (!currentStep) return true;
    const errors = getStepAnswerErrors(definition, currentStep.step, answers);
    setFieldErrors(errors);
    setSubmitError(null);
    if (Object.keys(errors).length === 0) return true;
    focusFirstInvalidField(errors);
    return false;
  };

  /**
   * Opens the review, or the first step that still needs an answer: editing an answer can
   * reveal questions in later steps.
   */
  const goToReview = () => {
    const blockingIndex = getFirstInvalidStepIndex(definition, answers);
    if (blockingIndex !== -1) goTo(blockingIndex, true);
    else if (questionnaireHistory.isPrevious("review")) questionnaireHistory.back();
    else goTo("review");
  };

  const next = () => {
    if (!validateCurrentStep()) return;
    const nextStep = visibleSteps[position + 1];
    if (editing || !nextStep) goToReview();
    else goTo(nextStep.stepIndex);
  };

  const goBack = () => {
    if (previousStep) goBackTo(previousStep.stepIndex, editing && currentStep !== null);
  };

  const finish = (nextPhase: "submitted" | "already-submitted" | "closed") => {
    finished.current = true;
    draftDiscarded.current = true;
    draft.clear();
    setPhase(nextPhase);
    // The steps stay behind in the history: leave them so "back" exits the questionnaire.
    questionnaireHistory.unwind();
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const submitAnswers = async () => {
    const blockingIndex = getFirstInvalidStepIndex(definition, answers);
    if (blockingIndex !== -1) {
      goTo(blockingIndex, true);
      return;
    }

    setSubmitError(null);
    try {
      await submit.mutateAsync({
        questionnaireId: questionnaire.id,
        answers: normalizeAnswersForSubmission(definition, answers),
      });
      finish("submitted");
    } catch (error) {
      if (isClosedError(error)) {
        finish("closed");
        return;
      }
      const code = getTrpcErrorCode(error);
      if (code === "CONFLICT") {
        finish("already-submitted");
        return;
      }
      setSubmitError(code === "TOO_MANY_REQUESTS" ? text.submitRateLimited : text.submitError);
    }
  };

  if (questionnaire.isClosed || phase === "closed") {
    return (
      <PublicSystemScreen
        code={text.closedCode}
        title={definition.copy.closedTitle}
        description={definition.copy.closedMessage}
        actions={
          <>
            {questionnaire.hasPublicResults ? (
              <PublicLink
                href={getQuestionnaireResultsPath(questionnaire.slug)}
                className="font-heading text-xs font-bold tracking-[0.08em] text-accent uppercase hover:text-foreground"
              >
                {text.closedResultsCta}
              </PublicLink>
            ) : null}
            <PublicLink
              href="/"
              className="font-heading text-xs font-bold tracking-[0.08em] text-accent uppercase hover:text-foreground"
            >
              {text.closedCta}
            </PublicLink>
          </>
        }
      />
    );
  }

  // One thank-you screen, whether the answers were just sent or on an earlier visit.
  if (phase === "submitted" || phase === "already-submitted" || hasResponded) {
    return (
      <PublicSystemScreen
        code={definition.copy.successTitle}
        title={questionnaire.title}
        description={definition.copy.successMessage}
        actions={
          <PublicSystemActionLink href={completionHref}>{completionLabel}</PublicSystemActionLink>
        }
      />
    );
  }

  if (phase === "intro") {
    return (
      <QuestionnaireIntro
        questionnaire={questionnaire}
        isLoading={!draft.isHydrated}
        hasDraft={started ? Object.keys(answers).length > 0 : draft.restoredDraft !== null}
        onStart={start}
      />
    );
  }

  const progress = getQuestionnaireProgress(definition, answers);
  const primaryLabel = submit.isPending
    ? text.submitting
    : !currentStep
      ? definition.copy.submitLabel
      : editing
        ? text.review.backToReview
        : definition.copy.nextLabel;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background focus:outline-none"
    >
      <QuestionnaireProgressHeader
        label={definition.copy.progressLabel}
        position={
          currentStep ? text.progressLabel(position + 1, visibleSteps.length) : text.review.title
        }
        answered={progress.answered}
        total={progress.total}
        draftStatus={draft.status}
      />
      <form
        noValidate
        className="flex flex-1 flex-col"
        onKeyDown={focusNextControlOnEnter}
        onSubmit={(event) => {
          event.preventDefault();
          if (currentStep) next();
          else void submitAnswers();
        }}
      >
        <div className={cn(questionnaireColumnClass, "flex-1 pt-8 sm:pt-12")}>
          {currentStep ? (
            <QuestionnaireStepForm
              step={currentStep.step}
              fields={currentStep.fields}
              answers={answers}
              errors={fieldErrors}
              errorSummary={errorSummary}
              onAnswerChange={updateAnswer}
            />
          ) : (
            <QuestionnaireReview
              sections={getQuestionnaireReviewSections(definition, answers)}
              disabled={submit.isPending}
              onEditStep={(stepIndex) => goTo(stepIndex, true)}
            />
          )}
          {submitError ? (
            <p
              role="alert"
              className="mt-6 border-l-[3px] border-accent bg-(--ui-error-bg) px-4 py-3 font-heading text-[15px] leading-snug font-semibold text-accent"
            >
              {submitError}
            </p>
          ) : null}
        </div>
        <QuestionnaireFlowActions
          backLabel={definition.copy.backLabel}
          backDisabled={!previousStep || submit.isPending}
          primaryLabel={primaryLabel}
          primaryDisabled={submit.isPending}
          primaryDescribedBy={`${pageId}-submit-status`}
          onBack={goBack}
        />
        <p id={`${pageId}-submit-status`} className="sr-only" aria-live="polite">
          {submit.isPending ? text.submittingStatus : ""}
        </p>
      </form>
    </main>
  );
}
