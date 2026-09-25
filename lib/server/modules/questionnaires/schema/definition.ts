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

const fieldBaseSchema = z.object({
  id: fieldIdSchema,
  label: copyTextSchema,
  description: copyTextSchema.optional(),
  required: z.boolean().default(false),
  publicResults: z.boolean().default(false),
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
  });

const contactFieldSchema = fieldBaseSchema.extend({
  type: z.enum(["email", "phone", "url"]),
  placeholder: copyTextSchema.optional(),
});

const singleChoiceFieldSchema = fieldBaseSchema.extend({
  type: z.literal("singleChoice"),
  options: z.array(choiceOptionSchema),
});

const multipleChoiceFieldSchema = fieldBaseSchema
  .extend({
    type: z.literal("multipleChoice"),
    options: z.array(choiceOptionSchema),
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

function createChoiceAnswerSchema(
  field: Extract<QuestionnaireField, { type: "singleChoice" | "multipleChoice" }>,
) {
  const optionIds = new Set(field.options.map((option) => option.id));
  const optionSchema = z
    .string()
    .uuid()
    .refine((value) => optionIds.has(value), {
      message: "Unknown option",
    });

  if (field.type === "singleChoice") {
    return withOptionalRequirement(optionSchema, field.required);
  }

  let schema = z.array(optionSchema).refine((values) => new Set(values).size === values.length, {
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

export function createQuestionnaireAnswersSchema(definition: QuestionnaireDefinition) {
  const shape: Record<string, z.ZodType> = {};

  for (const step of definition.steps) {
    for (const field of step.fields) {
      const schema = createQuestionnaireFieldAnswerSchema(field);
      if (schema) shape[field.id] = schema;
    }
  }

  return z.object(shape).strict();
}

export type QuestionnaireCopy = z.infer<typeof questionnaireCopySchema>;
export type QuestionnaireDefinition = z.infer<typeof questionnaireDefinitionSchema>;
export type QuestionnaireField = z.infer<typeof questionnaireFieldSchema>;
export type QuestionnaireStep = z.infer<typeof questionnaireStepSchema>;
export type QuestionnaireAnswers = z.infer<ReturnType<typeof createQuestionnaireAnswersSchema>>;
