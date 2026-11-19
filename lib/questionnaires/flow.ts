import { i18n } from "@/lib/i18n";
import {
  createQuestionnaireStepAnswersSchema,
  getQuestionnaireOtherLabel,
  isQuestionnaireOtherAnswer,
  resolveQuestionnaireLogic,
} from "@/lib/server/modules/questionnaires/schema/definition";

import type {
  QuestionnaireDefinition,
  QuestionnaireField,
  QuestionnaireLogicState,
  QuestionnaireStep,
} from "@/lib/server/modules/questionnaires/schema/definition";

export type QuestionnaireAnswerValues = Record<string, unknown>;
export type QuestionnaireDraftSnapshot = {
  answers: QuestionnaireAnswerValues;
  stepIndex?: number;
};

/** Where the user is inside the form: a step (index in `definition.steps`) or the final review. */
export type QuestionnaireFlowStop = number | "review";
/** `target` tells which control the message belongs to: the field itself or its "Altro" text. */
export type QuestionnaireAnswerError = { message: string; target: "field" | "other" };
export type VisibleQuestionnaireStep = {
  step: QuestionnaireStep;
  stepIndex: number;
  /**
   * Visible fields of the step, in definition order (never empty), as the respondent must see
   * them: `required` already accounts for `requiredWhen` and choice fields only list the
   * options currently offered.
   */
  fields: QuestionnaireField[];
};
export type QuestionnaireReviewItem = { field: QuestionnaireField; answer: string | null };
export type QuestionnaireReviewSection = {
  step: QuestionnaireStep;
  stepIndex: number;
  items: QuestionnaireReviewItem[];
};

type AnswerIssue = {
  code?: string;
  path?: readonly PropertyKey[];
  origin?: unknown;
  expected?: unknown;
  format?: unknown;
  minimum?: unknown;
  maximum?: unknown;
};

const estimatedSecondsByFieldType: Record<QuestionnaireField["type"], number> = {
  information: 8,
  boolean: 5,
  consent: 8,
  scale: 6,
  singleChoice: 8,
  multipleChoice: 12,
  date: 10,
  datetime: 15,
  integer: 12,
  decimal: 12,
  email: 15,
  phone: 15,
  url: 20,
  text: 20,
  textarea: 60,
};
const estimatedSecondsPerChoiceOption = 1.5;
const maxWeightedChoiceOptions = 12;

/** A conditional question is shown only to some respondents: it weighs half in the estimate. */
const conditionalFieldWeight = 0.5;

const validation = i18n.public.questionnaire.validation;
const reviewText = i18n.public.questionnaire.review;

/** ISO datetime → value for `<input type="datetime-local">` (local time, minutes precision). */
export function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

/** `datetime-local` value (or any parseable date string) → ISO datetime; "" when empty or invalid. */
export function toIsoDateTimeValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function isEmptyAnswer(
  field: QuestionnaireField,
  value: unknown,
  required: boolean = field.required,
) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "number") return Number.isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  // An unchecked mandatory consent is a missing answer, not a "false" one.
  return field.type === "consent" && required && value === false;
}

function isBlankOtherAnswer(value: unknown) {
  return isQuestionnaireOtherAnswer(value) && value.other.trim() === "";
}

/** True when the field has a usable answer (an "Altro" choice without its text does not count). */
function isAnswered(field: QuestionnaireField, value: unknown) {
  if (isEmptyAnswer(field, value) || isBlankOtherAnswer(value)) return false;
  return !Array.isArray(value) || !value.every(isBlankOtherAnswer);
}

/** Trims the "Altro" text; drops it when the field does not offer the "Altro" choice. */
function normalizeChoiceEntry(field: { allowOther?: boolean }, entry: unknown) {
  if (!isQuestionnaireOtherAnswer(entry)) return entry;
  return field.allowOther ? { other: entry.other.trim() } : undefined;
}

function normalizeAnswer(field: QuestionnaireField, value: unknown) {
  if (field.type === "datetime" && typeof value === "string") return toIsoDateTimeValue(value);
  if (field.type === "singleChoice") return normalizeChoiceEntry(field, value);
  if (field.type === "multipleChoice" && Array.isArray(value)) {
    return value
      .map((entry) => normalizeChoiceEntry(field, entry))
      .filter((entry) => entry !== undefined);
  }
  return value;
}

/**
 * Prepares answers for the answers schema:
 * - empty values are omitted (so cleared optional fields do not fail validation and cleared
 *   required ones are reported as missing);
 * - answers of hidden fields, choices of options that are not offered any more (see
 *   `schema/logic.ts`) and keys outside the definition are dropped;
 * - datetime values are converted to ISO strings;
 * - the "Altro" text is trimmed. An "Altro" choice left without text is KEPT (as `{ other: "" }`)
 *   so that validation asks for it instead of silently discarding the choice.
 */
export function normalizeAnswersForSubmission(
  definition: QuestionnaireDefinition,
  answers: QuestionnaireAnswerValues,
): QuestionnaireAnswerValues {
  const logic = resolveQuestionnaireLogic(definition, answers);
  const normalized: QuestionnaireAnswerValues = {};

  for (const step of definition.steps) {
    for (const field of step.fields) {
      if (field.type === "information" || !logic.visibleFieldIds.has(field.id)) continue;
      const value = normalizeAnswer(field, logic.answers[field.id]);
      if (!isEmptyAnswer(field, value, logic.requiredFieldIds.has(field.id))) {
        normalized[field.id] = value;
      }
    }
  }

  return normalized;
}

function formatDateBoundary(field: QuestionnaireField, boundary: string) {
  if (field.type === "date") {
    const [year, month, day] = boundary.split("-");
    return `${day}/${month}/${year}`;
  }
  return new Intl.DateTimeFormat(i18n.locale, { dateStyle: "short", timeStyle: "short" }).format(
    new Date(boundary),
  );
}

function dateRangeMessage(
  field: Extract<QuestionnaireField, { type: "date" | "datetime" }>,
  value: unknown,
) {
  const timestamp = typeof value === "string" ? new Date(value).getTime() : Number.NaN;
  if (field.min && timestamp < new Date(field.min).getTime()) {
    return validation.dateTooEarly(formatDateBoundary(field, field.min));
  }
  if (field.max && timestamp > new Date(field.max).getTime()) {
    return validation.dateTooLate(formatDateBoundary(field, field.max));
  }
  return validation.invalidDate;
}

function answerIssueMessage(field: QuestionnaireField, value: unknown, issue: AnswerIssue) {
  if (value === undefined) return validation.required;

  if (issue.path?.at(-1) === "other") {
    if (issue.code === "too_small") return validation.otherRequired;
    return issue.code === "too_big" && typeof issue.maximum === "number"
      ? validation.maxCharacters(issue.maximum)
      : validation.invalidValue;
  }

  const isChoice = field.type === "singleChoice" || field.type === "multipleChoice";
  const isDate = field.type === "date" || field.type === "datetime";

  switch (issue.code) {
    case "invalid_type":
      return issue.expected === "int" ? validation.integer : validation.invalidValue;
    case "too_small":
      if (typeof issue.minimum !== "number") return validation.invalidValue;
      if (issue.origin === "string") return validation.minCharacters(issue.minimum);
      if (issue.origin === "array") return validation.minOptions(issue.minimum);
      if (issue.origin === "number") return validation.minValue(issue.minimum);
      return validation.invalidValue;
    case "too_big":
      if (typeof issue.maximum !== "number") return validation.invalidValue;
      if (issue.origin === "string") return validation.maxCharacters(issue.maximum);
      if (issue.origin === "array") return validation.maxOptions(issue.maximum);
      if (issue.origin === "number") return validation.maxValue(issue.maximum);
      return validation.invalidValue;
    case "invalid_format":
      if (isChoice) return validation.invalidOption;
      if (issue.format === "email") return validation.invalidEmail;
      if (issue.format === "url") return validation.invalidUrl;
      if (isDate) return validation.invalidDate;
      return validation.invalidFormat;
    case "custom":
      if (isDate) return dateRangeMessage(field, value);
      if (isChoice) return validation.invalidOption;
      return validation.invalidValue;
    default:
      return validation.invalidValue;
  }
}

/**
 * Validates the answers of a single step against the real answers schema. Visibility is resolved
 * against the answers of the WHOLE questionnaire, so a conditional field controlled from an
 * earlier step is validated only (and always) when it is shown.
 * Returns `fieldId → error`; an empty object means the step is valid.
 */
export function getStepAnswerErrors(
  definition: QuestionnaireDefinition,
  step: QuestionnaireStep,
  answers: QuestionnaireAnswerValues,
): Record<string, QuestionnaireAnswerError> {
  const normalized = normalizeAnswersForSubmission(definition, answers);
  const result = createQuestionnaireStepAnswersSchema(definition, step.id).safeParse(normalized);
  if (result.success) return {};

  const fieldsById = new Map(step.fields.map((field) => [field.id, field]));
  const errors: Record<string, QuestionnaireAnswerError> = {};

  for (const issue of result.error.issues) {
    const fieldId = issue.path[0];
    if (typeof fieldId !== "string" || fieldId in errors) continue;
    const field = fieldsById.get(fieldId);
    if (!field) continue;
    errors[fieldId] = {
      message: answerIssueMessage(field, normalized[fieldId], issue),
      target: issue.path.at(-1) === "other" ? "other" : "field",
    };
  }

  return errors;
}

/** Same as `getStepAnswerErrors`, messages only: `fieldId → localized message`. */
export function validateStepAnswers(
  definition: QuestionnaireDefinition,
  step: QuestionnaireStep,
  answers: QuestionnaireAnswerValues,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(getStepAnswerErrors(definition, step, answers)).map(([fieldId, error]) => [
      fieldId,
      error.message,
    ]),
  );
}

function isStepValid(
  definition: QuestionnaireDefinition,
  step: QuestionnaireStep,
  answers: QuestionnaireAnswerValues,
) {
  return Object.keys(getStepAnswerErrors(definition, step, answers)).length === 0;
}

function isStepUntouched(fields: QuestionnaireField[], answers: QuestionnaireAnswerValues) {
  const questions = fields.filter((field) => field.type !== "information");
  // Steps without questions cannot be "answered": never treat them as the place to resume.
  return (
    questions.length > 0 && questions.every((field) => isEmptyAnswer(field, answers[field.id]))
  );
}

/** The field as the respondent must see it: resolved `required`, only the offered options. */
function toPresentedField(
  field: QuestionnaireField,
  logic: QuestionnaireLogicState,
): QuestionnaireField {
  const required = logic.requiredFieldIds.has(field.id);
  if (field.type !== "singleChoice" && field.type !== "multipleChoice") {
    return required === field.required ? field : { ...field, required };
  }
  const options = field.options.filter((option) => !logic.hiddenOptionIds.has(option.id));
  return required === field.required && options.length === field.options.length
    ? field
    : { ...field, required, options };
}

function getVisibleSteps(
  definition: QuestionnaireDefinition,
  logic: QuestionnaireLogicState,
): VisibleQuestionnaireStep[] {
  return definition.steps.flatMap((step, stepIndex) => {
    const fields = step.fields
      .filter((field) => logic.visibleFieldIds.has(field.id))
      .map((field) => toPresentedField(field, logic));
    return fields.length > 0 ? [{ step, stepIndex, fields }] : [];
  });
}

/**
 * Steps that have at least one visible field given `answers`, each with its visible fields.
 * Steps left without visible fields (hidden by a rule, or coming after a step whose `endWhen`
 * ended the questionnaire) are skipped by the flow in both directions.
 */
export function getVisibleQuestionnaireSteps(
  definition: QuestionnaireDefinition,
  answers: QuestionnaireAnswerValues,
): VisibleQuestionnaireStep[] {
  return getVisibleSteps(definition, resolveQuestionnaireLogic(definition, answers));
}

/** Answered and total visible questions (information fields are not questions). */
export function getQuestionnaireProgress(
  definition: QuestionnaireDefinition,
  answers: QuestionnaireAnswerValues,
): { answered: number; total: number } {
  const logic = resolveQuestionnaireLogic(definition, answers);
  const questions = getVisibleSteps(definition, logic)
    .flatMap((visibleStep) => visibleStep.fields)
    .filter((field) => field.type !== "information");

  return {
    answered: questions.filter((field) => isAnswered(field, logic.answers[field.id])).length,
    total: questions.length,
  };
}

/** Index of the first step whose visible fields fail validation, or -1 when all are valid. */
export function getFirstInvalidStepIndex(
  definition: QuestionnaireDefinition,
  answers: QuestionnaireAnswerValues,
): number {
  return definition.steps.findIndex((step) => !isStepValid(definition, step, answers));
}

/**
 * Stop to reopen when resuming a draft (or when the browser history asks for a stop).
 * Only steps with at least one visible field are eligible.
 * - With a saved `stepIndex`: that step (or the next visible one), never beyond the first step
 *   that fails validation. An index past the last step means the review, which is reachable only
 *   when every step is valid.
 * - Without it (legacy drafts): the first step that fails validation or has no answered question,
 *   falling back to the last visible step.
 * Returns `"review"` when no step is visible at all.
 */
export function getResumeStop(
  definition: QuestionnaireDefinition,
  draft: QuestionnaireDraftSnapshot,
): QuestionnaireFlowStop {
  const { answers, stepIndex } = draft;
  const visibleSteps = getVisibleQuestionnaireSteps(definition, answers);
  const lastVisible = visibleSteps.at(-1);
  if (!lastVisible) return "review";

  const hasSavedStep = typeof stepIndex === "number" && Number.isFinite(stepIndex);
  const firstBlocking = visibleSteps.find(
    ({ step, fields }) =>
      !isStepValid(definition, step, answers) ||
      (!hasSavedStep && isStepUntouched(fields, answers)),
  );
  const furthestReachable = (firstBlocking ?? lastVisible).stepIndex;

  if (!hasSavedStep) return furthestReachable;

  const savedIndex = Math.max(0, Math.trunc(stepIndex));
  if (!firstBlocking && savedIndex >= definition.steps.length) return "review";

  const target = Math.min(savedIndex, furthestReachable);
  // `furthestReachable` is a visible step at or after `target`, so a match always exists.
  const resumed = visibleSteps.find((visibleStep) => visibleStep.stepIndex >= target);
  return resumed?.stepIndex ?? furthestReachable;
}

function formatChoiceEntry(
  field: Extract<QuestionnaireField, { type: "singleChoice" | "multipleChoice" }>,
  entry: unknown,
) {
  if (isQuestionnaireOtherAnswer(entry)) {
    const text = entry.other.trim();
    return text ? `${getQuestionnaireOtherLabel(field)}: ${text}` : null;
  }
  return field.options.find((option) => option.id === entry)?.label ?? null;
}

function formatDateAnswer(field: QuestionnaireField, value: string) {
  if (field.type === "date") {
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(i18n.locale, { dateStyle: "short", timeStyle: "short" }).format(date);
}

/**
 * Human-readable answer for the review screen; `null` when the question has no usable answer
 * (the caller shows "Non risposto").
 */
export function formatAnswerForReview(field: QuestionnaireField, value: unknown): string | null {
  if (field.type === "information" || !isAnswered(field, value)) return null;

  switch (field.type) {
    case "boolean":
      return typeof value === "boolean" ? (value ? field.trueLabel : field.falseLabel) : null;
    case "consent":
      return value === true ? reviewText.consentGiven : reviewText.consentNotGiven;
    case "singleChoice":
      return formatChoiceEntry(field, value);
    case "multipleChoice": {
      const labels = (Array.isArray(value) ? value : [])
        .map((entry) => formatChoiceEntry(field, entry))
        .filter((label) => label !== null);
      return labels.length > 0 ? labels.join(", ") : null;
    }
    case "date":
    case "datetime":
      return typeof value === "string" ? formatDateAnswer(field, value) : null;
    default:
      if (typeof value === "number") {
        return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 20 }).format(value);
      }
      return typeof value === "string" ? value.trim() : null;
  }
}

/**
 * Answers grouped by step for the review screen: only visible questions, in definition order.
 * Steps without visible questions (e.g. information only) are left out.
 */
export function getQuestionnaireReviewSections(
  definition: QuestionnaireDefinition,
  answers: QuestionnaireAnswerValues,
): QuestionnaireReviewSection[] {
  return getVisibleQuestionnaireSteps(definition, answers).flatMap(
    ({ step, stepIndex, fields }) => {
      const items = fields
        .filter((field) => field.type !== "information")
        .map((field) => ({ field, answer: formatAnswerForReview(field, answers[field.id]) }));
      return items.length > 0 ? [{ step, stepIndex, items }] : [];
    },
  );
}

function estimatedFieldSeconds(field: QuestionnaireField) {
  const base = estimatedSecondsByFieldType[field.type];
  const seconds =
    field.type === "singleChoice" || field.type === "multipleChoice"
      ? base +
        Math.min(field.options.length + (field.allowOther ? 1 : 0), maxWeightedChoiceOptions) *
          estimatedSecondsPerChoiceOption
      : base;
  return seconds;
}

/**
 * Estimated completion time in whole minutes (at least 1), weighted by field type.
 * Conditional questions count for half: which ones are shown depends on the answers.
 */
export function getEstimatedMinutes(definition: QuestionnaireDefinition): number {
  const seconds = definition.steps
    .flatMap((step) =>
      step.fields.map((field) => {
        const conditional = step.visibleWhen !== undefined || field.visibleWhen !== undefined;
        return estimatedFieldSeconds(field) * (conditional ? conditionalFieldWeight : 1);
      }),
    )
    .reduce((total, seconds) => total + seconds, 0);
  return Math.max(1, Math.round(seconds / 60));
}
