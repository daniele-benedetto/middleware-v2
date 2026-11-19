import { z } from "zod";

import type {
  QuestionnaireChoiceField,
  QuestionnaireField,
} from "@/lib/server/modules/questionnaires/schema/definition";

/**
 * Conditional logic of a questionnaire: rules made of conditions on the answers of EARLIER
 * fields. The same rule shape drives:
 * - `field.visibleWhen`   → the field is shown only when the rule is satisfied;
 * - `field.requiredWhen`  → the field becomes mandatory when the rule is satisfied;
 * - `option.visibleWhen`  → the option of a choice field is offered only when satisfied;
 * - `step.visibleWhen`    → the whole step is shown only when satisfied;
 * - `step.endWhen`        → when satisfied after the step, every later step is skipped.
 *
 * A condition is never satisfied while its controlling field is hidden, whatever the operator.
 * While the controlling field is unanswered only `notAnswered` can be satisfied, so negative
 * operators (`notEquals`, `notIncludes`, `isNoneOf`) never fire on a blank answer.
 */

/**
 * Id of the synthetic "Altro" option in aggregates (analysis, public results) and in conditions.
 * It is never stored in answers (the free text travels as `{ other: string }`) and can never be
 * the id of an authored option.
 */
export const QUESTIONNAIRE_OTHER_OPTION_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";

export const questionnaireConditionOperatorSchema = z.enum([
  "equals",
  "notEquals",
  "isOneOf",
  "isNoneOf",
  "includes",
  "notIncludes",
  "includesAny",
  "includesAll",
  "selectedAtLeast",
  "selectedAtMost",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "between",
  "answered",
  "notAnswered",
]);

const conditionListItemSchema = z.union([z.number().finite(), z.string().trim().min(1)]);

/**
 * One condition on the answer of the field `fieldId`. The value depends on field and operator:
 * - boolean / consent: a boolean;
 * - choice fields: an option id (or `QUESTIONNAIRE_OTHER_OPTION_ID` when the field allows
 *   "Altro"), a list of them for `isOneOf` / `isNoneOf` / `includesAny` / `includesAll`, a
 *   number of selections for `selectedAtLeast` / `selectedAtMost`;
 * - scale / integer / decimal: a number, `[from, to]` (inclusive) for `between`;
 * - date / datetime: a date (`YYYY-MM-DD`) or ISO datetime, `[from, to]` for `between`;
 * - `answered` / `notAnswered`: no value.
 * Cross-field consistency is validated by the definition schema.
 */
export const questionnaireFieldConditionSchema = z.object({
  fieldId: z.string().uuid(),
  operator: questionnaireConditionOperatorSchema,
  value: z
    .union([
      z.boolean(),
      z.number().finite(),
      z.string().trim().min(1),
      z.array(conditionListItemSchema).min(1).max(50),
    ])
    .optional(),
});

export const QUESTIONNAIRE_RULE_MAX_CONDITIONS = 10;

/** Several conditions: `all` = every one must hold (E), `any` = at least one (O). */
export const questionnaireConditionGroupSchema = z.object({
  match: z.enum(["all", "any"]),
  conditions: z
    .array(questionnaireFieldConditionSchema)
    .min(1)
    .max(QUESTIONNAIRE_RULE_MAX_CONDITIONS),
});

/** A single condition (the original `visibleWhen` shape) or a group of conditions. */
export const questionnaireRuleSchema = z.union([
  questionnaireFieldConditionSchema,
  questionnaireConditionGroupSchema,
]);

export type QuestionnaireConditionOperator = z.infer<typeof questionnaireConditionOperatorSchema>;
export type QuestionnaireFieldCondition = z.infer<typeof questionnaireFieldConditionSchema>;
export type QuestionnaireConditionGroup = z.infer<typeof questionnaireConditionGroupSchema>;
export type QuestionnaireRule = z.infer<typeof questionnaireRuleSchema>;
export type QuestionnaireConditionValue = QuestionnaireFieldCondition["value"];
export type QuestionnaireOtherAnswer = { other: string };

type LogicOption = { id: string; label: string; visibleWhen?: QuestionnaireRule };
type LogicStep = {
  id?: string;
  visibleWhen?: QuestionnaireRule;
  endWhen?: QuestionnaireRule;
  fields: QuestionnaireField[];
};
/** Minimal structure needed to resolve the logic (a full definition satisfies it). */
export type QuestionnaireDefinitionShape = { steps: LogicStep[] };
/** Every field type except `information` can control a rule. */
export type QuestionnaireConditionSourceField = Exclude<
  QuestionnaireField,
  { type: "information" }
>;

const NUMBER_TYPES = ["scale", "integer", "decimal"] as const;
const DATE_TYPES = ["date", "datetime"] as const;
const COMPARISON_OPERATORS: QuestionnaireConditionOperator[] = [
  "equals",
  "notEquals",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "between",
  "answered",
  "notAnswered",
];
const LIST_OPERATORS: QuestionnaireConditionOperator[] = [
  "isOneOf",
  "isNoneOf",
  "includesAny",
  "includesAll",
];
const COUNT_OPERATORS: QuestionnaireConditionOperator[] = ["selectedAtLeast", "selectedAtMost"];
const NO_VALUE_OPERATORS: QuestionnaireConditionOperator[] = ["answered", "notAnswered"];

type NumberField = Extract<QuestionnaireField, { type: (typeof NUMBER_TYPES)[number] }>;
type DateField = Extract<QuestionnaireField, { type: (typeof DATE_TYPES)[number] }>;

function isNumberField(field: QuestionnaireField): field is NumberField {
  return (NUMBER_TYPES as readonly string[]).includes(field.type);
}

function isDateField(field: QuestionnaireField): field is DateField {
  return (DATE_TYPES as readonly string[]).includes(field.type);
}

function isChoiceField(field: QuestionnaireField): field is QuestionnaireChoiceField {
  return field.type === "singleChoice" || field.type === "multipleChoice";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True for the "Altro" variant of a choice answer: `{ other: "free text" }`. */
export function isQuestionnaireOtherAnswer(value: unknown): value is QuestionnaireOtherAnswer {
  return isPlainObject(value) && typeof value.other === "string";
}

export function isQuestionnaireConditionGroup(
  rule: QuestionnaireRule,
): rule is QuestionnaireConditionGroup {
  return "conditions" in rule;
}

/** Conditions of a rule, whatever its shape (none for an absent rule). */
export function getQuestionnaireRuleConditions(
  rule: QuestionnaireRule | undefined,
): QuestionnaireFieldCondition[] {
  if (!rule) return [];
  return isQuestionnaireConditionGroup(rule) ? rule.conditions : [rule];
}

/** Whether the conditions of a rule must all hold (`all`) or one is enough (`any`). */
export function getQuestionnaireRuleMatch(rule: QuestionnaireRule): "all" | "any" {
  return isQuestionnaireConditionGroup(rule) ? rule.match : "all";
}

/**
 * Builds the most compact valid rule: undefined without conditions, the plain condition when
 * there is only one, a group otherwise.
 */
export function createQuestionnaireRule(
  conditions: QuestionnaireFieldCondition[],
  match: "all" | "any" = "all",
): QuestionnaireRule | undefined {
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : { match, conditions };
}

/** Field types whose answer can control a rule. */
export function isQuestionnaireConditionSourceField(
  field: QuestionnaireField,
): field is QuestionnaireConditionSourceField {
  return field.type !== "information";
}

/** Operators a condition can use on a controlling field, first one being the default. */
export function getQuestionnaireConditionOperators(
  field: QuestionnaireField,
): QuestionnaireConditionOperator[] {
  switch (field.type) {
    case "boolean":
      return ["equals", "notEquals", "answered", "notAnswered"];
    case "consent":
      return ["equals"];
    case "singleChoice":
      return ["equals", "notEquals", "isOneOf", "isNoneOf", "answered", "notAnswered"];
    case "multipleChoice":
      return [
        "includes",
        "notIncludes",
        "includesAny",
        "includesAll",
        "selectedAtLeast",
        "selectedAtMost",
        "answered",
        "notAnswered",
      ];
    case "scale":
    case "integer":
    case "decimal":
    case "date":
    case "datetime":
      return COMPARISON_OPERATORS;
    case "information":
      return [];
    default:
      return ["answered", "notAnswered"];
  }
}

/** Shape of the value an operator expects on a controlling field. */
export type QuestionnaireConditionValueKind =
  | "none"
  | "boolean"
  | "option"
  | "options"
  | "count"
  | "number"
  | "numberRange"
  | "date"
  | "dateRange";

export function getQuestionnaireConditionValueKind(
  field: QuestionnaireField,
  operator: QuestionnaireConditionOperator,
): QuestionnaireConditionValueKind {
  if (NO_VALUE_OPERATORS.includes(operator)) return "none";
  if (field.type === "boolean" || field.type === "consent") return "boolean";
  if (isChoiceField(field)) {
    if (COUNT_OPERATORS.includes(operator)) return "count";
    return LIST_OPERATORS.includes(operator) ? "options" : "option";
  }
  if (isNumberField(field)) return operator === "between" ? "numberRange" : "number";
  if (isDateField(field)) return operator === "between" ? "dateRange" : "date";
  return "none";
}

/** Option ids a condition can reference on a choice field ("Altro" included when allowed). */
export function getQuestionnaireConditionOptionIds(field: QuestionnaireChoiceField): string[] {
  return [
    ...field.options.map((option) => option.id),
    ...(field.allowOther ? [QUESTIONNAIRE_OTHER_OPTION_ID] : []),
  ];
}

const SCALE_GRID_TOLERANCE = 1e-9;

/** Whether `value` is one of the selectable values of a scale (`min`, `min + step`, …). */
export function isQuestionnaireScaleValue(
  field: { min: number; max: number; step?: number },
  value: number,
): boolean {
  if (value < field.min || value > field.max) return false;
  const steps = (value - field.min) / (field.step ?? 1);
  return Math.abs(steps - Math.round(steps)) < SCALE_GRID_TOLERANCE;
}

function isValidDateValue(field: DateField, value: unknown): value is string {
  if (typeof value !== "string") return false;
  const schema = field.type === "date" ? z.iso.date() : z.iso.datetime({ offset: true });
  return schema.safeParse(value).success;
}

function getNumberValueIssue(field: NumberField, operator: string, value: number): string | null {
  if (field.min !== undefined && value < field.min) {
    return "condition value must not be below the minimum of the referenced field";
  }
  if (field.max !== undefined && value > field.max) {
    return "condition value must not be above the maximum of the referenced field";
  }
  const exact = operator === "equals" || operator === "notEquals";
  if (exact && field.type === "scale" && !isQuestionnaireScaleValue(field, value)) {
    return "condition value must be one of the values of the scale";
  }
  if (exact && field.type === "integer" && !Number.isInteger(value)) {
    return "condition value must be an integer";
  }
  return null;
}

function getValueIssue(
  controller: QuestionnaireField,
  operator: QuestionnaireConditionOperator,
  value: QuestionnaireConditionValue,
): string | null {
  const kind = getQuestionnaireConditionValueKind(controller, operator);

  switch (kind) {
    case "none":
      return value === undefined ? null : "this condition does not take a value";
    case "boolean":
      return typeof value === "boolean" ? null : "condition value must be a boolean";
    case "option":
    case "options": {
      if (!isChoiceField(controller)) return "condition is not compatible with the field";
      const allowed = new Set(getQuestionnaireConditionOptionIds(controller));
      const values = kind === "option" ? [value] : Array.isArray(value) ? value : null;
      if (!values || values.length === 0) return "condition value must be a list of options";
      if (new Set(values).size !== values.length) return "condition options must be unique";
      return values.every((item) => typeof item === "string" && allowed.has(item))
        ? null
        : "condition value must be an option of the referenced field";
    }
    case "count": {
      if (!isChoiceField(controller)) return "condition is not compatible with the field";
      const max = getQuestionnaireConditionOptionIds(controller).length;
      return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max
        ? null
        : "condition value must be a number of selections of the referenced field";
    }
    case "number":
      if (typeof value !== "number" || !isNumberField(controller)) {
        return "condition value must be a number";
      }
      return getNumberValueIssue(controller, operator, value);
    case "numberRange": {
      if (!isNumberField(controller) || !Array.isArray(value) || value.length !== 2) {
        return "condition value must be a range of two numbers";
      }
      const [from, to] = value;
      if (typeof from !== "number" || typeof to !== "number" || from > to) {
        return "condition value must be a range of two ordered numbers";
      }
      return (
        getNumberValueIssue(controller, operator, from) ??
        getNumberValueIssue(controller, operator, to)
      );
    }
    case "date":
      return isDateField(controller) && isValidDateValue(controller, value)
        ? null
        : "condition value must be a valid date";
    case "dateRange": {
      if (!isDateField(controller) || !Array.isArray(value) || value.length !== 2) {
        return "condition value must be a range of two dates";
      }
      const [from, to] = value;
      if (!isValidDateValue(controller, from) || !isValidDateValue(controller, to)) {
        return "condition value must be a range of two valid dates";
      }
      return Date.parse(from) <= Date.parse(to)
        ? null
        : "condition value must be a range of two ordered dates";
    }
  }
}

/**
 * Why `condition` is not valid against its controlling field, or null when it is valid.
 * `controller` must be the field with id `condition.fieldId` taken among the fields the rule is
 * allowed to reference (undefined when there is none).
 */
export function getQuestionnaireConditionIssue(
  condition: QuestionnaireFieldCondition,
  controller: QuestionnaireField | undefined,
): string | null {
  if (!controller) return "condition must reference an earlier field";
  if (!getQuestionnaireConditionOperators(controller).includes(condition.operator)) {
    return "condition operator is not compatible with the referenced field";
  }
  return getValueIssue(controller, condition.operator, condition.value);
}

export type QuestionnaireRuleIssue = { message: string; path: PropertyKey[] };

/** Issues of every condition of `rule`, with the path of the condition inside the rule. */
export function getQuestionnaireRuleIssues(
  rule: QuestionnaireRule | undefined,
  controllers: ReadonlyMap<string, QuestionnaireField>,
): QuestionnaireRuleIssue[] {
  if (!rule) return [];
  const grouped = isQuestionnaireConditionGroup(rule);
  return getQuestionnaireRuleConditions(rule).flatMap((condition, index) => {
    const message = getQuestionnaireConditionIssue(condition, controllers.get(condition.fieldId));
    return message ? [{ message, path: grouped ? ["conditions", index] : [] }] : [];
  });
}

/** Whether a choice field can be compared with something (it needs an option or "Altro"). */
function hasComparableValues(field: QuestionnaireField) {
  return !isChoiceField(field) || getQuestionnaireConditionOptionIds(field).length > 0;
}

function toSourceFields(fields: QuestionnaireField[]) {
  return fields.filter(
    (field): field is QuestionnaireConditionSourceField =>
      isQuestionnaireConditionSourceField(field) && hasComparableValues(field),
  );
}

/**
 * Where a rule lives, which decides the fields it can reference:
 * - `field` (its `visibleWhen` / `requiredWhen` and the `visibleWhen` of its options): the
 *   fields that come before it in definition order;
 * - `step` (`visibleWhen`): the fields of the earlier steps;
 * - `stepEnd` (`endWhen`): the fields up to the end of that step;
 * - `all`: every field (filters over the responses).
 */
export type QuestionnaireRuleTarget =
  | { kind: "field"; fieldId: string }
  | { kind: "step"; stepIndex: number }
  | { kind: "stepEnd"; stepIndex: number }
  | { kind: "all" };

/** Fields a rule placed at `target` can reference, in definition order. */
export function listQuestionnaireRuleSourceFields(
  definition: QuestionnaireDefinitionShape,
  target: QuestionnaireRuleTarget,
): QuestionnaireConditionSourceField[] {
  const collected: QuestionnaireField[] = [];

  for (const [stepIndex, step] of definition.steps.entries()) {
    if (target.kind === "step" && target.stepIndex === stepIndex) return toSourceFields(collected);
    for (const field of step.fields) {
      if (target.kind === "field" && target.fieldId === field.id) return toSourceFields(collected);
      collected.push(field);
    }
    if (target.kind === "stepEnd" && target.stepIndex === stepIndex) {
      return toSourceFields(collected);
    }
  }

  return target.kind === "all" ? toSourceFields(collected) : [];
}

/** Fields a rule on the field `fieldId` can reference: the eligible fields that come before it. */
export function listQuestionnaireConditionSourceFields(
  definition: QuestionnaireDefinitionShape,
  fieldId: string,
): QuestionnaireConditionSourceField[] {
  return listQuestionnaireRuleSourceFields(definition, { kind: "field", fieldId });
}

function toDateValue(field: DateField, date: Date) {
  return field.type === "date" ? date.toISOString().slice(0, 10) : date.toISOString();
}

function defaultScalar(controller: QuestionnaireField, now: Date): number | string {
  if (isNumberField(controller)) return controller.min ?? controller.max ?? 0;
  if (isDateField(controller))
    return controller.min || controller.max || toDateValue(controller, now);
  return 0;
}

/**
 * Value of a condition after its operator (or controlling field) changed: `previous` is kept
 * when it still has the right shape, converted when possible, else replaced by a default.
 * `now` is only used as the default of date conditions without `min` / `max`.
 */
export function coerceQuestionnaireConditionValue(
  controller: QuestionnaireField,
  operator: QuestionnaireConditionOperator,
  previous: QuestionnaireConditionValue,
  now: Date = new Date(),
): QuestionnaireConditionValue {
  const kind = getQuestionnaireConditionValueKind(controller, operator);
  const previousList = Array.isArray(previous)
    ? previous
    : previous === undefined
      ? []
      : [previous];

  switch (kind) {
    case "none":
      return undefined;
    case "boolean":
      return typeof previous === "boolean" ? previous : true;
    case "option":
    case "options": {
      if (!isChoiceField(controller)) return undefined;
      const allowed = getQuestionnaireConditionOptionIds(controller);
      const kept = previousList.filter(
        (item): item is string => typeof item === "string" && allowed.includes(item),
      );
      const values = kept.length > 0 ? kept : allowed.slice(0, 1);
      return kind === "option" ? values[0] : values;
    }
    case "count":
      return typeof previous === "number" && Number.isInteger(previous) && previous >= 0
        ? previous
        : 1;
    case "number":
    case "numberRange": {
      const numbers = previousList.filter((item): item is number => typeof item === "number");
      const first = numbers[0] ?? (defaultScalar(controller, now) as number);
      if (kind === "number") return first;
      const fallbackEnd = isNumberField(controller) ? (controller.max ?? first) : first;
      return [first, Math.max(first, numbers[1] ?? fallbackEnd)];
    }
    case "date":
    case "dateRange": {
      if (!isDateField(controller)) return undefined;
      const dates = previousList.filter((item) => isValidDateValue(controller, item));
      const first = dates[0] ?? (defaultScalar(controller, now) as string);
      if (kind === "date") return first;
      const end = dates[1] ?? (controller.max || first);
      return [first, Date.parse(end) >= Date.parse(first) ? end : first];
    }
  }
}

/** Default condition when `controller` is picked as the controlling field. */
export function createQuestionnaireCondition(
  controller: QuestionnaireConditionSourceField,
  now: Date = new Date(),
): QuestionnaireFieldCondition | null {
  const operator = getQuestionnaireConditionOperators(controller)[0];
  if (!operator || !hasComparableValues(controller)) return null;
  const value = coerceQuestionnaireConditionValue(controller, operator, undefined, now);
  return value === undefined
    ? { fieldId: controller.id, operator }
    : { fieldId: controller.id, operator, value };
}

function toComparable(controller: QuestionnaireField, value: unknown): number | null {
  if (isNumberField(controller)) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  if (isDateField(controller) && typeof value === "string" && value !== "") {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  return null;
}

/** Ids selected in a choice answer, the "Altro" variant counted as its synthetic option. */
function getSelectedOptionIds(answer: unknown): string[] {
  const entries = Array.isArray(answer) ? answer : answer === undefined ? [] : [answer];
  return entries.flatMap((entry) => {
    if (isQuestionnaireOtherAnswer(entry)) return [QUESTIONNAIRE_OTHER_OPTION_ID];
    return typeof entry === "string" && entry !== "" ? [entry] : [];
  });
}

/**
 * Whether the controlling field has an answer conditions can look at. A consent is always
 * answered (unchecked = false); an "Altro" choice counts as soon as it is picked, before its
 * free text is typed, so that the fields depending on it show up immediately.
 */
function hasConditionAnswer(controller: QuestionnaireField, answer: unknown) {
  switch (controller.type) {
    case "consent":
      return true;
    case "boolean":
      return typeof answer === "boolean";
    case "singleChoice":
    case "multipleChoice":
      return getSelectedOptionIds(answer).length > 0;
    case "information":
      return false;
    default:
      if (isNumberField(controller) || isDateField(controller)) {
        return toComparable(controller, answer) !== null;
      }
      return typeof answer === "string" && answer.trim() !== "";
  }
}

function isComparisonSatisfied(
  condition: QuestionnaireFieldCondition,
  controller: QuestionnaireField,
  answer: unknown,
) {
  const actual = toComparable(controller, answer);
  const expected = (Array.isArray(condition.value) ? condition.value : [condition.value]).map(
    (item) => toComparable(controller, item),
  );
  const [first, second] = expected;
  if (actual === null || first === null || first === undefined) return false;

  switch (condition.operator) {
    case "equals":
      return actual === first;
    case "notEquals":
      return actual !== first;
    case "greaterThan":
      return actual > first;
    case "greaterThanOrEqual":
      return actual >= first;
    case "lessThan":
      return actual < first;
    case "lessThanOrEqual":
      return actual <= first;
    case "between":
      return second !== null && second !== undefined && actual >= first && actual <= second;
    default:
      return false;
  }
}

function isChoiceConditionSatisfied(condition: QuestionnaireFieldCondition, answer: unknown) {
  const selected = getSelectedOptionIds(answer);
  const expected = (Array.isArray(condition.value) ? condition.value : [condition.value]).filter(
    (item): item is string => typeof item === "string",
  );

  switch (condition.operator) {
    case "equals":
    case "includes":
    case "isOneOf":
    case "includesAny":
      return expected.some((item) => selected.includes(item));
    case "notEquals":
    case "notIncludes":
    case "isNoneOf":
      return !expected.some((item) => selected.includes(item));
    case "includesAll":
      return expected.length > 0 && expected.every((item) => selected.includes(item));
    case "selectedAtLeast":
      return typeof condition.value === "number" && selected.length >= condition.value;
    case "selectedAtMost":
      return typeof condition.value === "number" && selected.length <= condition.value;
    default:
      return false;
  }
}

/**
 * Whether the answer of a VISIBLE controlling field satisfies the condition.
 * `answer` is a raw client value or a stored answer.
 */
export function isQuestionnaireConditionSatisfied(
  condition: QuestionnaireFieldCondition,
  controller: QuestionnaireField,
  answer: unknown,
): boolean {
  const answered = hasConditionAnswer(controller, answer);
  if (condition.operator === "notAnswered") return !answered;
  if (condition.operator === "answered") return answered;
  if (!answered) return false;

  if (controller.type === "boolean" || controller.type === "consent") {
    const actual = answer === true;
    if (typeof condition.value !== "boolean") return false;
    return condition.operator === "equals"
      ? actual === condition.value
      : condition.operator === "notEquals" && actual !== condition.value;
  }
  if (isChoiceField(controller)) return isChoiceConditionSatisfied(condition, answer);
  return isComparisonSatisfied(condition, controller, answer);
}

export type QuestionnaireLogicState = {
  /** Fields currently shown, in definition order. */
  visibleFieldIds: Set<string>;
  /** Visible fields that are mandatory (`required` or a satisfied `requiredWhen`). */
  requiredFieldIds: Set<string>;
  /** Options of visible choice fields that are not offered (their own rule is not satisfied). */
  hiddenOptionIds: Set<string>;
  /** Index of the step whose `endWhen` ended the questionnaire, or null. */
  endedAtStepIndex: number | null;
  /**
   * Answers of the visible fields that conditions look at: choices pointing to options that
   * are not offered are dropped. Fields without an answer are absent.
   */
  answers: Record<string, unknown>;
};

function withoutHiddenOptions(
  field: QuestionnaireChoiceField,
  answer: unknown,
  hiddenOptionIds: ReadonlySet<string>,
) {
  const isOffered = (entry: unknown) => typeof entry !== "string" || !hiddenOptionIds.has(entry);
  if (field.type === "multipleChoice") {
    return Array.isArray(answer) ? answer.filter(isOffered) : answer;
  }
  return isOffered(answer) ? answer : undefined;
}

/**
 * Resolves the whole conditional logic given `answers` (raw client values or stored answers),
 * in definition order: every rule only sees the fields that come before it, so chains collapse
 * as expected and answers left on hidden fields or hidden options are ignored.
 * A choice field left without any option to pick (all hidden, no "Altro") is hidden.
 */
export function resolveQuestionnaireLogic(
  definition: QuestionnaireDefinitionShape,
  answers: Record<string, unknown>,
): QuestionnaireLogicState {
  const state: QuestionnaireLogicState = {
    visibleFieldIds: new Set(),
    requiredFieldIds: new Set(),
    hiddenOptionIds: new Set(),
    endedAtStepIndex: null,
    answers: {},
  };
  const earlierFields = new Map<string, QuestionnaireField>();

  const isSatisfied = (rule: QuestionnaireRule | undefined) => {
    if (!rule) return true;
    const check = (condition: QuestionnaireFieldCondition) => {
      const controller = earlierFields.get(condition.fieldId);
      return (
        controller !== undefined &&
        state.visibleFieldIds.has(controller.id) &&
        isQuestionnaireConditionSatisfied(condition, controller, state.answers[controller.id])
      );
    };
    const conditions = getQuestionnaireRuleConditions(rule);
    return getQuestionnaireRuleMatch(rule) === "any"
      ? conditions.some(check)
      : conditions.every(check);
  };

  for (const [stepIndex, step] of definition.steps.entries()) {
    const stepVisible = state.endedAtStepIndex === null && isSatisfied(step.visibleWhen);

    for (const field of step.fields) {
      let visible = stepVisible && isSatisfied(field.visibleWhen);
      let answer = answers[field.id];

      if (visible && isChoiceField(field)) {
        const options: LogicOption[] = field.options;
        const hidden = options.filter((option) => !isSatisfied(option.visibleWhen));
        if (hidden.length === options.length && options.length > 0 && !field.allowOther) {
          visible = false;
        } else {
          for (const option of hidden) state.hiddenOptionIds.add(option.id);
          answer = withoutHiddenOptions(field, answer, state.hiddenOptionIds);
        }
      }

      if (visible) {
        state.visibleFieldIds.add(field.id);
        if (answer !== undefined) state.answers[field.id] = answer;
        if (field.required || (field.requiredWhen && isSatisfied(field.requiredWhen))) {
          state.requiredFieldIds.add(field.id);
        }
      }
      earlierFields.set(field.id, field);
    }

    if (stepVisible && step.endWhen && isSatisfied(step.endWhen)) {
      state.endedAtStepIndex = stepIndex;
    }
  }

  return state;
}

/** Ids of the fields currently visible given `answers`. See `resolveQuestionnaireLogic`. */
export function getVisibleQuestionnaireFieldIds(
  definition: QuestionnaireDefinitionShape,
  answers: Record<string, unknown>,
): Set<string> {
  return resolveQuestionnaireLogic(definition, answers).visibleFieldIds;
}

/**
 * Whether `field` is visible given `answers`. `definition` must be the FULL definition:
 * a condition whose controlling field is not found before `field` hides the field.
 * When checking many fields, prefer one `resolveQuestionnaireLogic` call.
 */
export function isQuestionnaireFieldVisible(
  definition: QuestionnaireDefinitionShape,
  field: { id: string },
  answers: Record<string, unknown>,
): boolean {
  return getVisibleQuestionnaireFieldIds(definition, answers).has(field.id);
}

/**
 * Whether a set of answers satisfies `rule`, every field of the definition being a possible
 * controlling field (used to filter responses). Hidden controlling fields never satisfy it.
 */
export function matchesQuestionnaireRule(
  definition: QuestionnaireDefinitionShape,
  answers: Record<string, unknown>,
  rule: QuestionnaireRule,
): boolean {
  const logic = resolveQuestionnaireLogic(definition, answers);
  const fields = new Map(
    definition.steps.flatMap((step) => step.fields).map((field) => [field.id, field]),
  );
  const check = (condition: QuestionnaireFieldCondition) => {
    const controller = fields.get(condition.fieldId);
    return (
      controller !== undefined &&
      logic.visibleFieldIds.has(controller.id) &&
      isQuestionnaireConditionSatisfied(condition, controller, logic.answers[controller.id])
    );
  };
  const conditions = getQuestionnaireRuleConditions(rule);
  return getQuestionnaireRuleMatch(rule) === "any"
    ? conditions.some(check)
    : conditions.every(check);
}

export type QuestionnaireRuleLocation =
  | { kind: "stepVisible"; stepIndex: number }
  | { kind: "stepEnd"; stepIndex: number }
  | { kind: "fieldVisible"; stepIndex: number; fieldIndex: number }
  | { kind: "fieldRequired"; stepIndex: number; fieldIndex: number }
  | { kind: "optionVisible"; stepIndex: number; fieldIndex: number; optionIndex: number };

export type QuestionnaireRuleEntry = {
  location: QuestionnaireRuleLocation;
  rule: QuestionnaireRule;
  /** Fields the rule can reference, by id. Only valid while the walk is on this entry. */
  controllers: ReadonlyMap<string, QuestionnaireField>;
};

/**
 * Visits every rule of the definition in definition order, each with the fields it is allowed
 * to reference. `controllers` is a live map: read it inside `visit`, do not keep it.
 */
export function forEachQuestionnaireRule(
  definition: QuestionnaireDefinitionShape,
  visit: (entry: QuestionnaireRuleEntry) => void,
): void {
  const controllers = new Map<string, QuestionnaireField>();
  const emit = (location: QuestionnaireRuleLocation, rule: QuestionnaireRule | undefined) => {
    if (rule) visit({ location, rule, controllers });
  };

  definition.steps.forEach((step, stepIndex) => {
    emit({ kind: "stepVisible", stepIndex }, step.visibleWhen);
    step.fields.forEach((field, fieldIndex) => {
      emit({ kind: "fieldVisible", stepIndex, fieldIndex }, field.visibleWhen);
      emit({ kind: "fieldRequired", stepIndex, fieldIndex }, field.requiredWhen);
      if (isChoiceField(field)) {
        (field.options as LogicOption[]).forEach((option, optionIndex) =>
          emit({ kind: "optionVisible", stepIndex, fieldIndex, optionIndex }, option.visibleWhen),
        );
      }
      controllers.set(field.id, field);
    });
    emit({ kind: "stepEnd", stepIndex }, step.endWhen);
  });
}

/** Path of a rule inside the definition object. */
export function getQuestionnaireRulePath(location: QuestionnaireRuleLocation): PropertyKey[] {
  switch (location.kind) {
    case "stepVisible":
      return ["steps", location.stepIndex, "visibleWhen"];
    case "stepEnd":
      return ["steps", location.stepIndex, "endWhen"];
    case "fieldVisible":
      return ["steps", location.stepIndex, "fields", location.fieldIndex, "visibleWhen"];
    case "fieldRequired":
      return ["steps", location.stepIndex, "fields", location.fieldIndex, "requiredWhen"];
    case "optionVisible":
      return [
        "steps",
        location.stepIndex,
        "fields",
        location.fieldIndex,
        "options",
        location.optionIndex,
        "visibleWhen",
      ];
  }
}

/** Number of conditions in the whole definition (to tell when a cleanup removed some). */
export function countQuestionnaireConditions(definition: QuestionnaireDefinitionShape): number {
  let count = 0;
  forEachQuestionnaireRule(definition, ({ rule }) => {
    count += getQuestionnaireRuleConditions(rule).length;
  });
  return count;
}

function keepValidConditions(
  rule: QuestionnaireRule | undefined,
  controllers: ReadonlyMap<string, QuestionnaireField>,
): QuestionnaireRule | undefined {
  if (!rule) return undefined;
  const conditions = getQuestionnaireRuleConditions(rule);
  const valid = conditions.filter(
    (condition) =>
      getQuestionnaireConditionIssue(condition, controllers.get(condition.fieldId)) === null,
  );
  if (valid.length === conditions.length) return rule;
  return createQuestionnaireRule(valid, getQuestionnaireRuleMatch(rule));
}

function withRule<T extends object, K extends string>(
  target: T,
  key: K,
  rule: QuestionnaireRule | undefined,
): T {
  const { [key]: _removed, ...rest } = target as T & Record<K, unknown>;
  return (rule ? { ...rest, [key]: rule } : rest) as T;
}

/**
 * Removes every condition that is not valid any more (controlling field removed, moved after
 * the rule, changed type, option removed, value out of range), dropping the rules left empty.
 * Returns the same reference when nothing has to change.
 */
export function clearInvalidQuestionnaireConditions<T extends QuestionnaireDefinitionShape>(
  definition: T,
): T {
  const controllers = new Map<string, QuestionnaireField>();
  let changed = false;

  const clean = <V extends object, K extends string>(target: V, key: K): V => {
    const current = (target as V & Partial<Record<K, QuestionnaireRule>>)[key];
    const next = keepValidConditions(current, controllers);
    if (next === current) return target;
    changed = true;
    return withRule(target, key, next);
  };

  const steps = definition.steps.map((originalStep) => {
    let step = clean(originalStep, "visibleWhen");
    const fields = step.fields.map((originalField) => {
      let field = clean(clean(originalField, "visibleWhen"), "requiredWhen");
      if (isChoiceField(field)) {
        const current: LogicOption[] = field.options;
        const options = current.map((option) => clean(option, "visibleWhen"));
        if (options.some((option, index) => option !== current[index])) {
          field = { ...field, options } as typeof field;
        }
      }
      controllers.set(field.id, field);
      return field;
    });
    if (fields.some((field, index) => field !== step.fields[index])) step = { ...step, fields };
    return clean(step, "endWhen");
  });

  return changed ? ({ ...definition, steps } as T) : definition;
}

export type QuestionnaireDescribedCondition = {
  fieldLabel: string;
  operator: QuestionnaireConditionOperator;
  /** How `values` must be formatted for display. */
  valueKind: "none" | "text" | "number" | "date" | "datetime" | "consent";
  /** Labels, numbers or ISO dates; for a consent `1` (given) or `0` (not given). */
  values: Array<string | number>;
};
export type QuestionnaireDescribedRule = {
  match: "all" | "any";
  conditions: QuestionnaireDescribedCondition[];
};

function describeConditionValues(
  controller: QuestionnaireField,
  condition: QuestionnaireFieldCondition,
  otherLabel: (field: QuestionnaireChoiceField) => string,
): Pick<QuestionnaireDescribedCondition, "valueKind" | "values"> {
  const kind = getQuestionnaireConditionValueKind(controller, condition.operator);
  const list = Array.isArray(condition.value)
    ? condition.value
    : condition.value === undefined
      ? []
      : [condition.value];

  if (kind === "none") return { valueKind: "none", values: [] };
  if (controller.type === "boolean") {
    return {
      valueKind: "text",
      values: [condition.value === true ? controller.trueLabel : controller.falseLabel],
    };
  }
  if (isChoiceField(controller) && (kind === "option" || kind === "options")) {
    const labels = new Map(controller.options.map((option) => [option.id, option.label]));
    labels.set(QUESTIONNAIRE_OTHER_OPTION_ID, otherLabel(controller));
    return {
      valueKind: "text",
      values: list.map((item) => labels.get(String(item)) ?? String(item)),
    };
  }
  if (isDateField(controller)) {
    return {
      valueKind: controller.type === "date" ? "date" : "datetime",
      values: list.map(String),
    };
  }
  if (controller.type === "consent") {
    return { valueKind: "consent", values: [condition.value === true ? 1 : 0] };
  }
  return {
    valueKind: "number",
    values: list.filter((item): item is number => typeof item === "number"),
  };
}

/**
 * Label-resolved version of a rule, ready to be formatted for people (who never see ids).
 * Conditions whose controlling field is unknown are left out.
 */
export function describeQuestionnaireRule(
  rule: QuestionnaireRule,
  fields: ReadonlyMap<string, QuestionnaireField>,
  otherLabel: (field: QuestionnaireChoiceField) => string,
): QuestionnaireDescribedRule {
  return {
    match: getQuestionnaireRuleMatch(rule),
    conditions: getQuestionnaireRuleConditions(rule).flatMap((condition) => {
      const controller = fields.get(condition.fieldId);
      if (!controller) return [];
      return [
        {
          fieldLabel: controller.label,
          operator: condition.operator,
          ...describeConditionValues(controller, condition, otherLabel),
        },
      ];
    }),
  };
}
