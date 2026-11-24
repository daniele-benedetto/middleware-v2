import { z } from "zod";

import type {
  QuestionnaireChoiceField,
  QuestionnaireField,
} from "@/lib/server/modules/questionnaires/schema/definition";

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

export const questionnaireConditionGroupSchema = z.object({
  match: z.enum(["all", "any"]),
  conditions: z
    .array(questionnaireFieldConditionSchema)
    .min(1)
    .max(QUESTIONNAIRE_RULE_MAX_CONDITIONS),
});

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
export type QuestionnaireDefinitionShape = { steps: LogicStep[] };
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

export function isQuestionnaireOtherAnswer(value: unknown): value is QuestionnaireOtherAnswer {
  return isPlainObject(value) && typeof value.other === "string";
}

export function isQuestionnaireConditionGroup(
  rule: QuestionnaireRule,
): rule is QuestionnaireConditionGroup {
  return "conditions" in rule;
}

export function getQuestionnaireRuleConditions(
  rule: QuestionnaireRule | undefined,
): QuestionnaireFieldCondition[] {
  if (!rule) return [];
  return isQuestionnaireConditionGroup(rule) ? rule.conditions : [rule];
}

export function getQuestionnaireRuleMatch(rule: QuestionnaireRule): "all" | "any" {
  return isQuestionnaireConditionGroup(rule) ? rule.match : "all";
}

export function createQuestionnaireRule(
  conditions: QuestionnaireFieldCondition[],
  match: "all" | "any" = "all",
): QuestionnaireRule | undefined {
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : { match, conditions };
}

export function isQuestionnaireConditionSourceField(
  field: QuestionnaireField,
): field is QuestionnaireConditionSourceField {
  return field.type !== "information";
}

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

export function getQuestionnaireConditionOptionIds(field: QuestionnaireChoiceField): string[] {
  return [
    ...field.options.map((option) => option.id),
    ...(field.allowOther ? [QUESTIONNAIRE_OTHER_OPTION_ID] : []),
  ];
}

const SCALE_GRID_TOLERANCE = 1e-9;
const SCALE_MAX_DECIMALS = 10;

export const QUESTIONNAIRE_SCALE_MAX_VALUES = 101;

type ScaleBounds = { min: number; max: number; step?: number };

function countDecimals(value: number) {
  for (let decimals = 0; decimals < SCALE_MAX_DECIMALS; decimals += 1) {
    const scaled = value * 10 ** decimals;
    if (Math.abs(scaled - Math.round(scaled)) < SCALE_GRID_TOLERANCE) return decimals;
  }
  return SCALE_MAX_DECIMALS;
}

export function getQuestionnaireScaleValueCount(field: ScaleBounds): number {
  return Math.floor((field.max - field.min) / (field.step ?? 1) + SCALE_GRID_TOLERANCE) + 1;
}

export function getQuestionnaireScaleValues(field: ScaleBounds): number[] {
  const step = field.step ?? 1;
  const decimals = Math.max(countDecimals(field.min), countDecimals(step));
  const count = Math.min(getQuestionnaireScaleValueCount(field), QUESTIONNAIRE_SCALE_MAX_VALUES);
  return Array.from({ length: count }, (_, index) =>
    Number((field.min + index * step).toFixed(decimals)),
  );
}

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

function hasComparableValues(field: QuestionnaireField) {
  return !isChoiceField(field) || getQuestionnaireConditionOptionIds(field).length > 0;
}

function toSourceFields(fields: QuestionnaireField[]) {
  return fields.filter(
    (field): field is QuestionnaireConditionSourceField =>
      isQuestionnaireConditionSourceField(field) && hasComparableValues(field),
  );
}

export type QuestionnaireRuleTarget =
  | { kind: "field"; fieldId: string }
  | { kind: "step"; stepIndex: number }
  | { kind: "stepEnd"; stepIndex: number }
  | { kind: "all" };

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

function getSelectedOptionIds(answer: unknown): string[] {
  const entries = Array.isArray(answer) ? answer : answer === undefined ? [] : [answer];
  return entries.flatMap((entry) => {
    if (isQuestionnaireOtherAnswer(entry)) return [QUESTIONNAIRE_OTHER_OPTION_ID];
    return typeof entry === "string" && entry !== "" ? [entry] : [];
  });
}

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
  visibleFieldIds: Set<string>;
  requiredFieldIds: Set<string>;
  hiddenOptionIds: Set<string>;
  endedAtStepIndex: number | null;
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

export function getVisibleQuestionnaireFieldIds(
  definition: QuestionnaireDefinitionShape,
  answers: Record<string, unknown>,
): Set<string> {
  return resolveQuestionnaireLogic(definition, answers).visibleFieldIds;
}

export function isQuestionnaireFieldVisible(
  definition: QuestionnaireDefinitionShape,
  field: { id: string },
  answers: Record<string, unknown>,
): boolean {
  return getVisibleQuestionnaireFieldIds(definition, answers).has(field.id);
}

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
  controllers: ReadonlyMap<string, QuestionnaireField>;
};

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
  valueKind: "none" | "text" | "number" | "date" | "datetime" | "consent";
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
