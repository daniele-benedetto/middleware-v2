import { z } from "zod";

const fieldIdSchema = z.string().uuid();
const copyTextSchema = z.string().trim();
const dateSchema = z.iso.date();
const dateTimeSchema = z.iso.datetime({ offset: true });

export const questionnaireCopySchema = z.object({
  introduction: copyTextSchema.optional(),
  privacyNotice: copyTextSchema.optional(),
  privacyUrl: copyTextSchema.optional(),
  progressLabel: copyTextSchema,
  backLabel: copyTextSchema,
  nextLabel: copyTextSchema,
  submitLabel: copyTextSchema,
  requiredFieldsMessage: copyTextSchema,
  resumeMessage: copyTextSchema,
  successTitle: copyTextSchema,
  successMessage: copyTextSchema,
  alreadySubmittedTitle: copyTextSchema,
  alreadySubmittedMessage: copyTextSchema,
  closedTitle: copyTextSchema,
  closedMessage: copyTextSchema,
  resultsTitle: copyTextSchema,
  resultsEmptyMessage: copyTextSchema,
  completionCtaLabel: copyTextSchema.optional(),
  completionCtaHref: copyTextSchema.optional(),
});

/**
 * Conditional visibility: the field is shown only when the answer of an EARLIER field
 * (boolean, singleChoice, multipleChoice or scale) satisfies the condition.
 * - boolean: `equals` / `notEquals` with a boolean value
 * - singleChoice: `equals` / `notEquals` with an option id of the controlling field
 * - scale: `equals` / `notEquals` with a number inside the scale range
 * - multipleChoice: `includes` with an option id of the controlling field
 * A condition is never satisfied while the controlling field is hidden or unanswered,
 * whatever the operator. Cross-field consistency is validated by the definition schema.
 */
export const questionnaireFieldConditionSchema = z.object({
  fieldId: fieldIdSchema,
  operator: z.enum(["equals", "notEquals", "includes"]),
  value: z.union([z.boolean(), z.number().finite(), z.string().uuid()]),
});

const fieldBaseSchema = z.object({
  id: fieldIdSchema,
  label: copyTextSchema,
  description: copyTextSchema.optional(),
  required: z.boolean().default(false),
  publicResults: z.boolean().default(false),
  /** Absent means "always visible". */
  visibleWhen: questionnaireFieldConditionSchema.optional(),
});

const choiceOptionSchema = z.object({
  id: fieldIdSchema,
  label: copyTextSchema,
});

const textFieldSchema = fieldBaseSchema.extend({
  type: z.enum(["text", "textarea"]),
  placeholder: copyTextSchema.optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().nonnegative().optional(),
});

const numberFieldSchema = fieldBaseSchema
  .extend({
    type: z.enum(["integer", "decimal"]),
    integerVisualization: z.enum(["discrete", "histogram"]).optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    step: z.number().finite().positive().optional(),
  })
  .refine((field) => field.min === undefined || field.max === undefined || field.min <= field.max, {
    message: "min must be less than or equal to max",
    path: ["max"],
  })
  .superRefine((field, context) => {
    if (field.type !== "integer" && field.integerVisualization !== undefined) {
      context.addIssue({
        code: "custom",
        message: "integerVisualization is only valid for integer fields",
        path: ["integerVisualization"],
      });
    }
  });

const booleanFieldSchema = fieldBaseSchema.extend({
  type: z.literal("boolean"),
  trueLabel: copyTextSchema,
  falseLabel: copyTextSchema,
});

const dateFieldSchema = fieldBaseSchema
  .extend({
    type: z.enum(["date", "datetime"]),
    temporalMeaning: z.enum(["distribution", "event"]).default("distribution"),
    timeDetail: z.enum(["none", "hourOfDay", "dayHour"]).default("none"),
    min: z.string().trim().optional(),
    max: z.string().trim().optional(),
  })
  .superRefine((field, context) => {
    const valueSchema = field.type === "date" ? dateSchema : dateTimeSchema;

    for (const key of ["min", "max"] as const) {
      const value = field[key];
      if (value && !valueSchema.safeParse(value).success) {
        context.addIssue({ code: "custom", message: `Invalid ${field.type}`, path: [key] });
      }
    }

    if (field.min && field.max && new Date(field.min).getTime() > new Date(field.max).getTime()) {
      context.addIssue({ code: "custom", message: "min must be before max", path: ["max"] });
    }

    if (field.type === "date" && field.timeDetail !== "none") {
      context.addIssue({
        code: "custom",
        message: "timeDetail is only valid for datetime fields",
        path: ["timeDetail"],
      });
    }
  });

const contactFieldSchema = fieldBaseSchema.extend({
  type: z.enum(["email", "phone", "url"]),
  placeholder: copyTextSchema.optional(),
});

/**
 * Presentation-only: order of the options in the public results.
 * Omitted means "frequency" (most chosen first); "definition" keeps the authored order,
 * which is what ordinal options ("Mai / A volte / Spesso") need.
 */
export const choiceResultsOrderSchema = z.enum(["frequency", "definition"]);

/**
 * Id of the synthetic "Altro" option in aggregates (analysis, public results).
 * It is never stored in answers (the free text travels as `{ other: string }`) and can never be
 * the id of an authored option.
 */
export const QUESTIONNAIRE_OTHER_OPTION_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
export const QUESTIONNAIRE_OTHER_DEFAULT_LABEL = "Altro";
/** Max length of the "Altro" free text when the field does not set `otherMaxLength`. */
export const QUESTIONNAIRE_OTHER_DEFAULT_MAX_LENGTH = 200;

/** "Altro (specificare)": an extra choice whose free text is stored with the answer. */
const choiceOtherShape = {
  allowOther: z.boolean().optional(),
  /** Label of the extra choice; omitted or empty means `QUESTIONNAIRE_OTHER_DEFAULT_LABEL`. */
  otherLabel: copyTextSchema.optional(),
  /** Omitted means `QUESTIONNAIRE_OTHER_DEFAULT_MAX_LENGTH`. */
  otherMaxLength: z.number().int().positive().max(2000).optional(),
};

const singleChoiceFieldSchema = fieldBaseSchema.extend({
  type: z.literal("singleChoice"),
  options: z.array(choiceOptionSchema),
  resultsOrder: choiceResultsOrderSchema.optional(),
  ...choiceOtherShape,
});

const multipleChoiceFieldSchema = fieldBaseSchema
  .extend({
    type: z.literal("multipleChoice"),
    options: z.array(choiceOptionSchema),
    resultsOrder: choiceResultsOrderSchema.optional(),
    ...choiceOtherShape,
    minSelections: z.number().int().nonnegative().optional(),
    maxSelections: z.number().int().nonnegative().optional(),
  })
  .refine(
    (field) =>
      field.minSelections === undefined ||
      field.maxSelections === undefined ||
      field.minSelections <= field.maxSelections,
    {
      message: "minSelections must be less than or equal to maxSelections",
      path: ["maxSelections"],
    },
  );

const scaleFieldSchema = fieldBaseSchema
  .extend({
    type: z.literal("scale"),
    min: z.number().finite(),
    max: z.number().finite(),
    step: z.number().finite().positive().optional(),
    minLabel: copyTextSchema.optional(),
    maxLabel: copyTextSchema.optional(),
  })
  .refine((field) => field.min <= field.max, {
    message: "min must be less than or equal to max",
    path: ["max"],
  });

const consentFieldSchema = fieldBaseSchema.extend({
  type: z.literal("consent"),
  consentText: copyTextSchema,
});

const informationFieldSchema = fieldBaseSchema.extend({
  type: z.literal("information"),
});

export const questionnaireFieldSchema = z.discriminatedUnion("type", [
  textFieldSchema,
  numberFieldSchema,
  booleanFieldSchema,
  dateFieldSchema,
  contactFieldSchema,
  singleChoiceFieldSchema,
  multipleChoiceFieldSchema,
  scaleFieldSchema,
  consentFieldSchema,
  informationFieldSchema,
]);

export const questionnaireStepSchema = z.object({
  id: fieldIdSchema,
  title: copyTextSchema.optional(),
  description: copyTextSchema.optional(),
  fields: z.array(questionnaireFieldSchema),
});

export const questionnaireDefinitionSchema = z
  .object({
    version: z.literal(1),
    copy: questionnaireCopySchema,
    steps: z.array(questionnaireStepSchema),
  })
  .superRefine((definition, context) => {
    const seenStepIds = new Set<string>();
    const seenFieldIds = new Set<string>();
    const earlierFields = new Map<string, QuestionnaireField>();

    definition.steps.forEach((step, stepIndex) => {
      if (seenStepIds.has(step.id)) {
        context.addIssue({
          code: "custom",
          message: "Step ids must be unique",
          path: ["steps", stepIndex, "id"],
        });
      }
      seenStepIds.add(step.id);

      const seenOptionIds = new Set<string>();
      step.fields.forEach((field, fieldIndex) => {
        if (seenFieldIds.has(field.id)) {
          context.addIssue({
            code: "custom",
            message: "Field ids must be unique",
            path: ["steps", stepIndex, "fields", fieldIndex, "id"],
          });
        }
        seenFieldIds.add(field.id);

        if (field.visibleWhen) {
          const message = getQuestionnaireConditionIssue(
            field.visibleWhen,
            earlierFields.get(field.visibleWhen.fieldId),
          );
          if (message) {
            context.addIssue({
              code: "custom",
              message,
              path: ["steps", stepIndex, "fields", fieldIndex, "visibleWhen"],
            });
          }
        }
        earlierFields.set(field.id, field);

        if (field.type !== "singleChoice" && field.type !== "multipleChoice") return;

        field.options.forEach((option, optionIndex) => {
          if (seenOptionIds.has(option.id)) {
            context.addIssue({
              code: "custom",
              message: "Option ids must be unique",
              path: ["steps", stepIndex, "fields", fieldIndex, "options", optionIndex, "id"],
            });
          }
          seenOptionIds.add(option.id);
          if (option.id === QUESTIONNAIRE_OTHER_OPTION_ID) {
            context.addIssue({
              code: "custom",
              message: "Option id is reserved",
              path: ["steps", stepIndex, "fields", fieldIndex, "options", optionIndex, "id"],
            });
          }
        });
      });
    });
  });

function withOptionalRequirement<T extends z.ZodType>(schema: T, required: boolean) {
  return required ? schema : schema.optional();
}

function createTextAnswerSchema(field: Extract<QuestionnaireField, { type: "text" | "textarea" }>) {
  let schema = z.string().trim().min(1);
  if (field.minLength !== undefined) schema = schema.min(field.minLength);
  if (field.maxLength !== undefined) schema = schema.max(field.maxLength);
  return withOptionalRequirement(schema, field.required);
}

function createNumberAnswerSchema(
  field: Extract<QuestionnaireField, { type: "integer" | "decimal" | "scale" }>,
) {
  let schema = z.number().finite();
  if (field.type === "integer") schema = schema.int();
  if (field.min !== undefined) schema = schema.min(field.min);
  if (field.max !== undefined) schema = schema.max(field.max);
  return withOptionalRequirement(schema, field.required);
}

function createDateAnswerSchema(field: Extract<QuestionnaireField, { type: "date" | "datetime" }>) {
  const baseSchema = field.type === "date" ? dateSchema : dateTimeSchema;
  const schema = baseSchema.superRefine((value, context) => {
    const timestamp = new Date(value).getTime();
    if (field.min && timestamp < new Date(field.min).getTime()) {
      context.addIssue({ code: "custom", message: "Date is before the minimum" });
    }
    if (field.max && timestamp > new Date(field.max).getTime()) {
      context.addIssue({ code: "custom", message: "Date is after the maximum" });
    }
  });
  return withOptionalRequirement(schema, field.required);
}

/** Re-emits the issues of a nested parse (code, bounds, format… preserved) under `path`. */
function forwardIssues(
  context: z.RefinementCtx,
  issues: readonly z.core.$ZodIssue[],
  path: PropertyKey[] = [],
) {
  for (const issue of issues) {
    context.addIssue({ ...issue, path: [...path, ...issue.path] } as Parameters<
      typeof context.addIssue
    >[0]);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True for the "Altro" variant of a choice answer: `{ other: "free text" }`. */
export function isQuestionnaireOtherAnswer(value: unknown): value is QuestionnaireOtherAnswer {
  return isPlainObject(value) && typeof value.other === "string";
}

/** Label of the "Altro" choice of a field. */
export function getQuestionnaireOtherLabel(field: { otherLabel?: string }) {
  return field.otherLabel?.trim() || QUESTIONNAIRE_OTHER_DEFAULT_LABEL;
}

export function getQuestionnaireOtherMaxLength(field: { otherMaxLength?: number }) {
  return field.otherMaxLength ?? QUESTIONNAIRE_OTHER_DEFAULT_MAX_LENGTH;
}

/**
 * One selected value of a choice field: an option id or, when the field allows it,
 * `{ other: string }` (trimmed, non-empty, at most `otherMaxLength` characters).
 * Issues of the free text are reported under the `other` key.
 */
function createChoiceValueSchema(field: QuestionnaireChoiceField) {
  const optionIds = new Set(field.options.map((option) => option.id));
  const optionSchema = z
    .string()
    .uuid()
    .refine((value) => optionIds.has(value), {
      message: "Unknown option",
    });
  if (!field.allowOther) return optionSchema;

  const otherSchema = z
    .object({ other: z.string().trim().min(1).max(getQuestionnaireOtherMaxLength(field)) })
    .strict();

  return z.unknown().transform((value, context): string | QuestionnaireOtherAnswer => {
    const result = isPlainObject(value)
      ? otherSchema.safeParse(value)
      : optionSchema.safeParse(value);
    if (result.success) return result.data;
    forwardIssues(context, result.error.issues);
    return z.NEVER;
  });
}

function hasUniqueChoiceValues(values: Array<string | QuestionnaireOtherAnswer>) {
  const optionIds = values.filter((value) => typeof value === "string");
  return new Set(optionIds).size === optionIds.length && values.length - optionIds.length <= 1;
}

function createChoiceAnswerSchema(field: QuestionnaireChoiceField) {
  const valueSchema = createChoiceValueSchema(field);

  if (field.type === "singleChoice") {
    return withOptionalRequirement(valueSchema, field.required);
  }

  // The "Altro" entry counts as one selection for minSelections/maxSelections.
  let schema = z.array(valueSchema).refine(hasUniqueChoiceValues, {
    message: "Choice values must be unique",
  });
  if (field.minSelections !== undefined) schema = schema.min(field.minSelections);
  if (field.maxSelections !== undefined) schema = schema.max(field.maxSelections);
  if (field.required) schema = schema.min(Math.max(field.minSelections ?? 0, 1));
  return withOptionalRequirement(schema, field.required);
}

export function createQuestionnaireFieldAnswerSchema(field: QuestionnaireField) {
  switch (field.type) {
    case "text":
    case "textarea":
      return createTextAnswerSchema(field);
    case "integer":
    case "decimal":
    case "scale":
      return createNumberAnswerSchema(field);
    case "boolean":
    case "consent":
      return withOptionalRequirement(z.boolean(), field.required);
    case "date":
    case "datetime":
      return createDateAnswerSchema(field);
    case "email":
      return withOptionalRequirement(z.string().trim().email(), field.required);
    case "phone":
      return withOptionalRequirement(z.string().trim().min(1), field.required);
    case "url":
      return withOptionalRequirement(z.string().trim().url(), field.required);
    case "singleChoice":
    case "multipleChoice":
      return createChoiceAnswerSchema(field);
    case "information":
      return null;
  }
}

const CONDITION_SOURCE_TYPES = ["boolean", "singleChoice", "multipleChoice", "scale"] as const;

/** Field types whose answer can control the visibility of a later field. */
export function isQuestionnaireConditionSourceField(
  field: QuestionnaireField,
): field is QuestionnaireConditionSourceField {
  return (CONDITION_SOURCE_TYPES as readonly string[]).includes(field.type);
}

/** Operators a condition can use on a controlling field, first one being the default. */
export function getQuestionnaireConditionOperators(
  field: QuestionnaireField,
): QuestionnaireFieldCondition["operator"][] {
  if (field.type === "multipleChoice") return ["includes"];
  return isQuestionnaireConditionSourceField(field) ? ["equals", "notEquals"] : [];
}

/**
 * Why `condition` is not valid against its controlling field, or null when it is valid.
 * `controller` must be the field with id `condition.fieldId` taken among the fields that come
 * BEFORE the conditioned one in definition order (undefined when there is none).
 */
export function getQuestionnaireConditionIssue(
  condition: QuestionnaireFieldCondition,
  controller: QuestionnaireField | undefined,
): string | null {
  if (!controller) return "visibleWhen must reference an earlier field";
  if (!getQuestionnaireConditionOperators(controller).includes(condition.operator)) {
    return "visibleWhen operator is not compatible with the referenced field";
  }

  const { value } = condition;
  switch (controller.type) {
    case "boolean":
      return typeof value === "boolean" ? null : "visibleWhen value must be a boolean";
    case "scale":
      return typeof value === "number" && value >= controller.min && value <= controller.max
        ? null
        : "visibleWhen value must be a number inside the scale range";
    case "singleChoice":
    case "multipleChoice":
      return controller.options.some((option) => option.id === value)
        ? null
        : "visibleWhen value must be an option of the referenced field";
    default:
      return "visibleWhen operator is not compatible with the referenced field";
  }
}

/**
 * Fields a condition on `fieldId` can reference: the eligible fields that come before it in
 * definition order (choice fields need at least one option to compare with).
 */
export function listQuestionnaireConditionSourceFields(
  definition: QuestionnaireDefinitionShape,
  fieldId: string,
): QuestionnaireConditionSourceField[] {
  const sources: QuestionnaireConditionSourceField[] = [];

  for (const step of definition.steps) {
    for (const field of step.fields) {
      if (field.id === fieldId) return sources;
      if (!isQuestionnaireConditionSourceField(field)) continue;
      if (
        (field.type === "singleChoice" || field.type === "multipleChoice") &&
        !field.options.length
      )
        continue;
      sources.push(field);
    }
  }

  return [];
}

/** Default condition when `controller` is picked as the controlling field. */
export function createQuestionnaireCondition(
  controller: QuestionnaireConditionSourceField,
): QuestionnaireFieldCondition | null {
  const operator = getQuestionnaireConditionOperators(controller)[0];
  const value =
    controller.type === "boolean"
      ? true
      : controller.type === "scale"
        ? controller.min
        : controller.options[0]?.id;
  return value === undefined ? null : { fieldId: controller.id, operator, value };
}

function isConditionSatisfied(
  condition: QuestionnaireFieldCondition,
  controller: QuestionnaireField,
  answer: unknown,
) {
  if (controller.type === "multipleChoice") {
    return (
      condition.operator === "includes" && Array.isArray(answer) && answer.includes(condition.value)
    );
  }

  const answered =
    controller.type === "boolean"
      ? typeof answer === "boolean"
      : controller.type === "scale"
        ? typeof answer === "number" && Number.isFinite(answer)
        : controller.type === "singleChoice"
          ? (typeof answer === "string" && answer !== "") || isQuestionnaireOtherAnswer(answer)
          : false;
  if (!answered) return false;
  if (condition.operator === "equals") return answer === condition.value;
  if (condition.operator === "notEquals") return answer !== condition.value;
  return false;
}

/**
 * Ids of the fields currently visible given `answers` (raw client values or stored answers),
 * resolved in definition order. A conditioned field is visible only when its controlling field
 * comes earlier, is itself visible and its answer satisfies the condition, so chains of
 * conditions collapse as expected and answers left on hidden fields are ignored.
 */
export function getVisibleQuestionnaireFieldIds(
  definition: QuestionnaireDefinitionShape,
  answers: Record<string, unknown>,
): Set<string> {
  const visible = new Set<string>();
  const earlierFields = new Map<string, QuestionnaireField>();

  for (const step of definition.steps) {
    for (const field of step.fields) {
      const condition = field.visibleWhen;
      const controller = condition ? earlierFields.get(condition.fieldId) : undefined;
      if (
        !condition ||
        (controller &&
          visible.has(controller.id) &&
          isConditionSatisfied(condition, controller, answers[controller.id]))
      ) {
        visible.add(field.id);
      }
      earlierFields.set(field.id, field);
    }
  }

  return visible;
}

/**
 * Whether `field` is visible given `answers`. `definition` must be the FULL definition:
 * a condition whose controlling field is not found before `field` hides the field.
 * When checking many fields, prefer one `getVisibleQuestionnaireFieldIds` call.
 */
export function isQuestionnaireFieldVisible(
  definition: QuestionnaireDefinitionShape,
  field: { id: string },
  answers: Record<string, unknown>,
): boolean {
  return getVisibleQuestionnaireFieldIds(definition, answers).has(field.id);
}

/**
 * Removes every `visibleWhen` that is not valid any more (controlling field removed, moved after
 * the conditioned field, changed type, option removed, value out of range).
 * Returns the same reference when nothing has to change.
 */
export function clearInvalidQuestionnaireConditions<T extends QuestionnaireDefinitionShape>(
  definition: T,
): T {
  const earlierFields = new Map<string, QuestionnaireField>();
  let changed = false;

  const steps = definition.steps.map((step) => {
    let stepChanged = false;
    const fields = step.fields.map((field) => {
      const condition = field.visibleWhen;
      const invalid =
        condition !== undefined &&
        getQuestionnaireConditionIssue(condition, earlierFields.get(condition.fieldId)) !== null;
      earlierFields.set(field.id, field);
      if (!invalid) return field;
      stepChanged = true;
      const { visibleWhen: _visibleWhen, ...rest } = field;
      return rest as typeof field;
    });
    if (!stepChanged) return step;
    changed = true;
    return { ...step, fields };
  });

  return changed ? ({ ...definition, steps } as T) : definition;
}

function createAnswersSchema(definition: QuestionnaireDefinition, stepId?: string) {
  const fields = definition.steps.flatMap((step) =>
    step.fields.map((field) => ({
      field,
      schema: createQuestionnaireFieldAnswerSchema(field),
      validated: stepId === undefined || step.id === stepId,
    })),
  );
  const answerableIds = new Set(
    fields.filter(({ schema }) => schema !== null).map(({ field }) => field.id),
  );

  return z.record(z.string(), z.unknown()).transform((input, context) => {
    const unknownKeys = Object.keys(input).filter((key) => !answerableIds.has(key));
    if (unknownKeys.length > 0) {
      context.addIssue({ code: "unrecognized_keys", keys: unknownKeys, input });
    }

    const visibleIds = getVisibleQuestionnaireFieldIds(definition, input);
    const output: Record<string, unknown> = {};

    for (const { field, schema, validated } of fields) {
      if (!schema || !validated || !visibleIds.has(field.id)) continue;
      const result = schema.safeParse(input[field.id]);
      if (!result.success) forwardIssues(context, result.error.issues, [field.id]);
      else if (result.data !== undefined) output[field.id] = result.data;
    }

    return output;
  });
}

/**
 * Schema of a whole submission (`fieldId → answer`).
 * - Keys that are not answerable fields of the definition are rejected.
 * - Hidden fields (see `visibleWhen`) are never required and their answers are STRIPPED from the
 *   parsed output without validation: what gets stored only contains answers of visible fields.
 * - Issues are reported with `path[0] === fieldId` and the code/bounds of the field schema.
 */
export function createQuestionnaireAnswersSchema(definition: QuestionnaireDefinition) {
  return createAnswersSchema(definition);
}

/**
 * Schema for validating ONE step while filling in: takes the answers of the whole questionnaire
 * (needed to resolve visibility against earlier steps), validates only the visible fields of
 * the step `stepId` and outputs only their answers.
 */
export function createQuestionnaireStepAnswersSchema(
  definition: QuestionnaireDefinition,
  stepId: string,
) {
  return createAnswersSchema(definition, stepId);
}

export type ChoiceResultsOrder = z.infer<typeof choiceResultsOrderSchema>;
export type QuestionnaireCopy = z.infer<typeof questionnaireCopySchema>;
export type QuestionnaireDefinition = z.infer<typeof questionnaireDefinitionSchema>;
export type QuestionnaireField = z.infer<typeof questionnaireFieldSchema>;
export type QuestionnaireStep = z.infer<typeof questionnaireStepSchema>;
/** Minimal structure needed to resolve visibility (a full definition satisfies it). */
export type QuestionnaireDefinitionShape = { steps: Array<{ fields: QuestionnaireField[] }> };
export type QuestionnaireFieldCondition = z.infer<typeof questionnaireFieldConditionSchema>;
export type QuestionnaireChoiceField = Extract<
  QuestionnaireField,
  { type: "singleChoice" | "multipleChoice" }
>;
export type QuestionnaireConditionSourceField = Extract<
  QuestionnaireField,
  { type: "boolean" | "singleChoice" | "multipleChoice" | "scale" }
>;
export type QuestionnaireOtherAnswer = { other: string };
/** Stored answer of a singleChoice field / one entry of a multipleChoice answer. */
export type QuestionnaireChoiceAnswerValue = string | QuestionnaireOtherAnswer;
export type QuestionnaireAnswers = z.infer<ReturnType<typeof createQuestionnaireAnswersSchema>>;
