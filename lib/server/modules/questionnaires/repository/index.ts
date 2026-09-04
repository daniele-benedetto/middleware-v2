import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type QuestionnaireSubmissionRecord = {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  definition: unknown;
  firstResponseAt: Date | null;
};

export type QuestionnaireResponsePersistInput = {
  questionnaireId: string;
  schemaVersion: number;
  definitionSnapshot: unknown;
  anonymousTokenHash: string;
  answers: unknown;
};

export type QuestionnaireResponseRecord = {
  id: string;
  questionnaireId: string;
  schemaVersion: number;
  definitionSnapshot: unknown;
  anonymousTokenHash: string;
  answers: unknown;
  submittedAt: Date;
};

export type QuestionnaireSubmissionTransaction = {
  createResponse: (
    input: QuestionnaireResponsePersistInput,
  ) => Promise<QuestionnaireResponseRecord>;
  setFirstResponseAt: (questionnaireId: string) => Promise<void>;
};

const QUESTIONNAIRE_SUBMISSION_SELECT = {
  id: true,
  status: true,
  definition: true,
  firstResponseAt: true,
} as const satisfies Prisma.QuestionnaireSelect;

const QUESTIONNAIRE_AGGREGATE_SELECT = {
  id: true,
  status: true,
  definition: true,
} as const satisfies Prisma.QuestionnaireSelect;

const QUESTIONNAIRE_RESPONSE_SELECT = {
  id: true,
  questionnaireId: true,
  schemaVersion: true,
  definitionSnapshot: true,
  anonymousTokenHash: true,
  answers: true,
  submittedAt: true,
} as const satisfies Prisma.QuestionnaireResponseSelect;

export const questionnairesRepository = {
  async getById(id: string) {
    return prisma.questionnaire.findUnique({
      where: { id },
      select: QUESTIONNAIRE_SUBMISSION_SELECT,
    });
  },
  async getForAggregation(id: string) {
    return prisma.questionnaire.findUnique({
      where: { id },
      select: QUESTIONNAIRE_AGGREGATE_SELECT,
    });
  },
  async withQuestionnaireForSubmission<T>(
    questionnaireId: string,
    operation: (
      questionnaire: QuestionnaireSubmissionRecord,
      transaction: QuestionnaireSubmissionTransaction,
    ) => Promise<T>,
  ) {
    return prisma.$transaction(async (prismaTransaction) => {
      const questionnaire = await prismaTransaction.questionnaire.findUnique({
        where: { id: questionnaireId },
        select: QUESTIONNAIRE_SUBMISSION_SELECT,
      });

      if (!questionnaire) return null;

      const transaction: QuestionnaireSubmissionTransaction = {
        async createResponse(input) {
          return prismaTransaction.questionnaireResponse.create({
            data: {
              questionnaireId: input.questionnaireId,
              schemaVersion: input.schemaVersion,
              definitionSnapshot: input.definitionSnapshot as Prisma.InputJsonValue,
              anonymousTokenHash: input.anonymousTokenHash,
              answers: input.answers as Prisma.InputJsonValue,
            },
            select: QUESTIONNAIRE_RESPONSE_SELECT,
          });
        },
        async setFirstResponseAt(id) {
          await prismaTransaction.questionnaire.updateMany({
            where: { id, firstResponseAt: null },
            data: { firstResponseAt: new Date() },
          });
        },
      };

      return operation(questionnaire, transaction);
    });
  },
};

export const questionnaireResponsesRepository = {
  async listByQuestionnaireId(questionnaireId: string) {
    return prisma.questionnaireResponse.findMany({
      where: { questionnaireId },
      orderBy: { submittedAt: "asc" },
      select: QUESTIONNAIRE_RESPONSE_SELECT,
    });
  },
};
