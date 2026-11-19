import { z } from "zod";

import {
  forEachQuestionnaireRule,
  getQuestionnaireRuleIssues,
  getQuestionnaireRulePath,
  isQuestionnaireScaleValue,
  QUESTIONNAIRE_OTHER_OPTION_ID,
  questionnaireRuleSchema,
  resolveQuestionnaireLogic,
} from "@/lib/server/modules/questionnaires/schema/logic";

import type { QuestionnaireOtherAnswer } from "@/lib/server/modules/questionnaires/schema/logic";

export * from "@/lib/server/modules/questionnaires/schema/logic";

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

const fieldBaseSchema = z.object({
  id: fieldIdSchema,
  label: copyTextSchema,
  description: copyTextSchema.optional(),
  required: z.boolean().default(false),
  publicResults: z.boolean().default(false),
  /** Absent means "always visible". See `schema/logic.ts`. */
  visibleWhen: questionnaireRuleSchema.optional(),
  /** The field is mandatory while this rule is satisfied, on top of `required`. */
  requiredWhen: questionnaireRuleSchema.optional(),
});

const choiceOptionSchema = z.object({
  id: fieldIdSchema,
  label: copyTextSchema,
  /** The option is offered only while this rule is satisfied. Absent means "always". */
  visibleWhen: questionnaireRuleSchema.optional(),
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
  /** The whole step is shown only while this rule (on fields of earlier steps) is satisfied. */
  visibleWhen: questionnaireRuleSchema.optional(),
  /**
   * When satisfied once the step is filled in (fields up to this step included), the
   * questionnaire ends here: every later step is skipped.
   */
  endWhen: questionnaireRuleSchema.optional(),
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

    forEachQuestionnaireRule(definition, ({ location, rule, controllers }) => {
      for (const issue of getQuestionnaireRuleIssues(rule, controllers)) {
        context.addIssue({
          code: "custom",
          message: issue.message,
          path: [...getQuestionnaireRulePath(location), ...issue.path],
        });
      }
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
  if (field.type !== "scale") return withOptionalRequirement(schema, field.required);
  // A scale only offers `min`, `min + step`, …: anything in between is not a real answer.
  const scaleSchema = schema.refine((value) => isQuestionnaireScaleValue(field, value), {
    message: "Value is not one of the scale values",
  });
  return withOptionalRequirement(scaleSchema, field.required);
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
      return withOptionalRequirement(z.boolean(), field.required);
    case "consent":
      // A mandatory consent must be given: an unchecked box (`false`) is not an answer.
      return field.required ? z.literal(true) : z.boolean().optional();
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

function createAnswersSchema(definition: QuestionnaireDefinition, stepId?: string) {
  const fields = definition.steps.flatMap((step) =>
    step.fields.map((field) => ({
      field,
      schema: createQuestionnaireFieldAnswerSchema(field),
      // Used while a `requiredWhen` rule makes an optional field mandatory.
      requiredSchema: field.required
        ? null
        : createQuestionnaireFieldAnswerSchema({ ...field, required: true }),
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

    const logic = resolveQuestionnaireLogic(definition, input);
    const output: Record<string, unknown> = {};

    for (const { field, schema, requiredSchema, validated } of fields) {
      if (!schema || !validated || !logic.visibleFieldIds.has(field.id)) continue;
      const value = input[field.id];
      const picksHiddenOption = (Array.isArray(value) ? value : [value]).some(
        (entry) => typeof entry === "string" && logic.hiddenOptionIds.has(entry),
      );
      if (picksHiddenOption) {
        context.addIssue({ code: "custom", message: "Unknown option", path: [field.id] });
        continue;
      }
      const fieldSchema =
        requiredSchema && logic.requiredFieldIds.has(field.id) ? requiredSchema : schema;
      const result = fieldSchema.safeParse(value);
      if (!result.success) forwardIssues(context, result.error.issues, [field.id]);
      else if (result.data !== undefined) output[field.id] = result.data;
    }

    return output;
  });
}

/**
 * Schema of a whole submission (`fieldId → answer`).
 * - Keys that are not answerable fields of the definition are rejected.
 * - Hidden fields (see `schema/logic.ts`) are never required and their answers are STRIPPED from
 *   the parsed output without validation: what gets stored only contains answers of visible
 *   fields. Fields made mandatory by `requiredWhen` are required; options that are not offered
 *   are rejected.
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
export type QuestionnaireChoiceField = Extract<
  QuestionnaireField,
  { type: "singleChoice" | "multipleChoice" }
>;
/** Stored answer of a singleChoice field / one entry of a multipleChoice answer. */
export type QuestionnaireChoiceAnswerValue = string | QuestionnaireOtherAnswer;
export type QuestionnaireAnswers = z.infer<ReturnType<typeof createQuestionnaireAnswersSchema>>;
