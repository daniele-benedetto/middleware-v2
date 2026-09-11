import "server-only";

import { z } from "zod";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import {
  questionnaireResponsesRepository,
  questionnairesRepository,
} from "@/lib/server/modules/questionnaires/repository";
import {
  createQuestionnaireAnswersSchema,
  questionnaireDefinitionSchema,
} from "@/lib/server/modules/questionnaires/schema";

import type {
  QuestionnaireResponseRecord,
  QuestionnaireSubmissionRecord,
  QuestionnaireSubmissionTransaction,
} from "@/lib/server/modules/questionnaires/repository";
import type {
  QuestionnaireDefinition,
  QuestionnaireField,
} from "@/lib/server/modules/questionnaires/schema";

type SubmitQuestionnaireResponseInput = {
  questionnaireId: string;
  anonymousTokenHash: string;
  answers: unknown;
};

type PublicChoiceResult = {
  kind: "choice";
  fieldId: string;
  responseCount: number;
  options: Array<{ optionId: string; count: number }>;
};

type PublicBooleanResult = {
  kind: "boolean";
  fieldId: string;
  responseCount: number;
  trueCount: number;
  falseCount: number;
};

type PublicNumberResult = {
  kind: "number";
  fieldId: string;
  responseCount: number;
  minimum: number | null;
  maximum: number | null;
  average: number | null;
};

type PublicDateResult = {
  kind: "date";
  fieldId: string;
  responseCount: number;
  minimum: string | null;
  maximum: string | null;
};

export type QuestionnairePublicResult =
  | PublicChoiceResult
  | PublicBooleanResult
  | PublicNumberResult
  | PublicDateResult;

export type QuestionnaireResponseServiceRepositories = {
  getById: (id: string) => Promise<QuestionnaireSubmissionRecord | null>;
  getForAggregation: (id: string) => Promise<{
    id: string;
    status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
    definition: unknown;
  } | null>;
  withQuestionnaireForSubmission: <T>(
    questionnaireId: string,
    operation: (
      questionnaire: QuestionnaireSubmissionRecord,
      transaction: QuestionnaireSubmissionTransaction,
    ) => Promise<T>,
  ) => Promise<T | null>;
  hasResponse?: (questionnaireId: string, anonymousTokenHash: string) => Promise<boolean>;
  listByQuestionnaireId: (questionnaireId: string) => Promise<QuestionnaireResponseRecord[]>;
};

function parseDefinition(value: unknown): QuestionnaireDefinition {
  const result = questionnaireDefinitionSchema.safeParse(value);

  if (!result.success) {
    throw new ApiError(500, "INTERNAL_ERROR", "Questionnaire definition is invalid");
  }

  return result.data;
}

function assertPublished(questionnaire: QuestionnaireSubmissionRecord) {
  if (questionnaire.status === "PUBLISHED") return;

  if (questionnaire.status === "CLOSED") {
    throw new ApiError(409, "CONFLICT", "Questionnaire is closed", { reason: "CLOSED" });
  }

  throw new ApiError(404, "NOT_FOUND", "Questionnaire is not available");
}

function isUniqueResponseError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function getPublicFields(definition: QuestionnaireDefinition) {
  return definition.steps
    .flatMap((step) => step.fields)
    .filter(
      (field): field is QuestionnaireField & { publicResults: true } =>
        field.publicResults &&
        [
          "boolean",
          "singleChoice",
          "multipleChoice",
          "scale",
          "integer",
          "decimal",
          "date",
          "datetime",
        ].includes(field.type),
    );
}

function getAnswerRecord(answers: unknown): Record<string, unknown> {
  const result = answersRecordSchema.safeParse(answers);
  return result.success ? result.data : {};
}

const answersRecordSchema = z.record(z.string(), z.unknown());

function aggregateField(
  field: QuestionnaireField,
  responses: QuestionnaireResponseRecord[],
): QuestionnairePublicResult | null {
  const values = responses
    .map((response) => getAnswerRecord(response.answers)[field.id])
    .filter((value) => value !== undefined);

  if (field.type === "boolean") {
    const booleanValues = values.filter((value): value is boolean => typeof value === "boolean");
    return {
      kind: "boolean",
      fieldId: field.id,
      responseCount: booleanValues.length,
      trueCount: booleanValues.filter(Boolean).length,
      falseCount: booleanValues.filter((value) => !value).length,
    };
  }

  if (field.type === "singleChoice" || field.type === "multipleChoice") {
    const counts = new Map(field.options.map((option) => [option.id, 0]));
    let responseCount = 0;

    for (const value of values) {
      const selected = field.type === "multipleChoice" ? value : [value];
      if (!Array.isArray(selected)) continue;
      const selectedOptionIds = selected.filter(
        (optionId): optionId is string => typeof optionId === "string" && counts.has(optionId),
      );
      if (selectedOptionIds.length === 0) continue;
      responseCount += 1;
      selectedOptionIds.forEach((optionId) =>
        counts.set(optionId, (counts.get(optionId) ?? 0) + 1),
      );
    }

    return {
      kind: "choice",
      fieldId: field.id,
      responseCount,
      options: [...counts].map(([optionId, count]) => ({ optionId, count })),
    };
  }

  if (["scale", "integer", "decimal"].includes(field.type)) {
    const numericValues = values.filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value),
    );
    const total = numericValues.reduce((sum, value) => sum + value, 0);

    return {
      kind: "number",
      fieldId: field.id,
      responseCount: numericValues.length,
      minimum: numericValues.length > 0 ? Math.min(...numericValues) : null,
      maximum: numericValues.length > 0 ? Math.max(...numericValues) : null,
      average: numericValues.length > 0 ? total / numericValues.length : null,
    };
  }

  if (field.type === "date" || field.type === "datetime") {
    const dateValues = values
      .filter(
        (value): value is string =>
          typeof value === "string" && Number.isFinite(new Date(value).getTime()),
      )
      .sort();

    return {
      kind: "date",
      fieldId: field.id,
      responseCount: dateValues.length,
      minimum: dateValues[0] ?? null,
      maximum: dateValues.at(-1) ?? null,
    };
  }

  return null;
}

export function createQuestionnaireResponsesService(
  repositories: QuestionnaireResponseServiceRepositories = {
    getById: questionnairesRepository.getById,
    getForAggregation: questionnairesRepository.getForAggregation,
    withQuestionnaireForSubmission: questionnairesRepository.withQuestionnaireForSubmission,
    hasResponse: questionnaireResponsesRepository.hasResponse,
    listByQuestionnaireId: questionnaireResponsesRepository.listByQuestionnaireId,
  },
) {
  return {
    async assertDefinitionCanChange(questionnaireId: string) {
      const questionnaire = await repositories.getById(questionnaireId);

      if (!questionnaire) {
        throw new ApiError(404, "NOT_FOUND", "Questionnaire not found");
      }
      if (questionnaire.firstResponseAt) {
        throw new ApiError(
          409,
          "CONFLICT",
          "Questionnaire structure is locked after the first response",
        );
      }
    },
    async submit(input: SubmitQuestionnaireResponseInput) {
      try {
        const response = await repositories.withQuestionnaireForSubmission(
          input.questionnaireId,
          async (questionnaire, transaction) => {
            assertPublished(questionnaire);
            const definition = parseDefinition(questionnaire.definition);
            const answersResult = createQuestionnaireAnswersSchema(definition).safeParse(
              input.answers,
            );
            if (!answersResult.success) {
              throw new ApiError(
                422,
                "VALIDATION_ERROR",
                "Questionnaire answers are invalid",
                answersResult.error.flatten(),
              );
            }
            const answers = answersResult.data;
            const response = await transaction.createResponse({
              questionnaireId: questionnaire.id,
              schemaVersion: definition.version,
              definitionSnapshot: definition,
              anonymousTokenHash: input.anonymousTokenHash,
              answers,
            });
            await transaction.setFirstResponseAt(questionnaire.id);
            return response;
          },
        );

        if (!response) {
          throw new ApiError(404, "NOT_FOUND", "Questionnaire not found");
        }

        return {
          id: response.id,
          questionnaireId: response.questionnaireId,
          submittedAt: response.submittedAt.toISOString(),
        };
      } catch (error) {
        if (isUniqueResponseError(error)) {
          throw new ApiError(409, "CONFLICT", "A response has already been submitted", {
            reason: "ALREADY_SUBMITTED",
          });
        }

        throw error;
      }
    },
    async hasResponded(questionnaireId: string, anonymousTokenHash: string) {
      return repositories.hasResponse?.(questionnaireId, anonymousTokenHash) ?? false;
    },
    async getPublicResults(questionnaireId: string) {
      const questionnaire = await repositories.getForAggregation(questionnaireId);

      if (!questionnaire) {
        throw new ApiError(404, "NOT_FOUND", "Questionnaire not found");
      }
      if (questionnaire.status !== "CLOSED") {
        throw new ApiError(404, "NOT_FOUND", "Questionnaire results are not available");
      }

      const definition = parseDefinition(questionnaire.definition);
      const responses = await repositories.listByQuestionnaireId(questionnaire.id);

      return getPublicFields(definition)
        .map((field) => aggregateField(field, responses))
        .filter((result): result is QuestionnairePublicResult => result !== null);
    },
  };
}

export const questionnaireResponsesService = createQuestionnaireResponsesService();
