import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type { ListQuestionnairesQuery } from "@/lib/server/modules/questionnaires/schema";

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
  async listForCms(questionnaireId: string, pagination: PaginationParams) {
    return prisma.questionnaireResponse.findMany({
      where: { questionnaireId },
      orderBy: { submittedAt: "desc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: { id: true, questionnaireId: true, schemaVersion: true, submittedAt: true },
    });
  },
  async countForCms(questionnaireId: string) {
    return prisma.questionnaireResponse.count({ where: { questionnaireId } });
  },
  async getByIdForCms(id: string, questionnaireId?: string) {
    return prisma.questionnaireResponse.findFirst({
      where: { id, questionnaireId },
      select: {
        id: true,
        questionnaireId: true,
        schemaVersion: true,
        definitionSnapshot: true,
        answers: true,
        submittedAt: true,
      },
    });
  },
};

const cmsQuestionnaireSelect = {
  id: true,
  title: true,
  titleStyled: true,
  homeVariant: true,
  slug: true,
  status: true,
  publishedAt: true,
  closedAt: true,
  firstResponseAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { responses: true } },
} as const satisfies Prisma.QuestionnaireSelect;
const cmsQuestionnaireDetailSelect = {
  ...cmsQuestionnaireSelect,
  descriptionRich: true,
  definition: true,
} as const satisfies Prisma.QuestionnaireSelect;
function whereForCms(query: ListQuestionnairesQuery): Prisma.QuestionnaireWhereInput {
  return {
    status: query.status,
    OR: query.q
      ? [
          { title: { contains: query.q, mode: "insensitive" } },
          { slug: { contains: query.q, mode: "insensitive" } },
        ]
      : undefined,
  };
}

export const cmsQuestionnairesRepository = {
  list(query: ListQuestionnairesQuery, pagination: PaginationParams) {
    return prisma.questionnaire.findMany({
      where: whereForCms(query),
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: cmsQuestionnaireSelect,
    });
  },
  count(query: ListQuestionnairesQuery) {
    return prisma.questionnaire.count({ where: whereForCms(query) });
  },
  getById(id: string) {
    return prisma.questionnaire.findUnique({ where: { id }, select: cmsQuestionnaireDetailSelect });
  },
  create(input: {
    title: string;
    titleStyled?: unknown | null;
    homeVariant?: string;
    slug: string;
    descriptionRich?: unknown | null;
    definition: unknown;
  }) {
    return prisma.questionnaire.create({
      data: {
        title: input.title,
        titleStyled:
          input.titleStyled === null
            ? Prisma.JsonNull
            : (input.titleStyled as Prisma.InputJsonValue | undefined),
        homeVariant: input.homeVariant,
        slug: input.slug,
        definition: input.definition as Prisma.InputJsonValue,
        descriptionRich:
          input.descriptionRich === null
            ? Prisma.JsonNull
            : (input.descriptionRich as Prisma.InputJsonValue | undefined),
      },
      select: cmsQuestionnaireDetailSelect,
    });
  },
  update(
    id: string,
    input: {
      title?: string;
      titleStyled?: unknown | null;
      homeVariant?: string;
      slug?: string;
      descriptionRich?: unknown | null;
      definition?: unknown;
    },
  ) {
    return prisma.questionnaire.update({
      where: { id },
      data: {
        ...input,
        titleStyled:
          input.titleStyled === null
            ? Prisma.JsonNull
            : (input.titleStyled as Prisma.InputJsonValue | undefined),
        homeVariant: input.homeVariant,
        definition:
          input.definition === undefined ? undefined : (input.definition as Prisma.InputJsonValue),
        descriptionRich:
          input.descriptionRich === null
            ? Prisma.JsonNull
            : (input.descriptionRich as Prisma.InputJsonValue | undefined),
      },
      select: cmsQuestionnaireDetailSelect,
    });
  },
  transition(id: string, status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED") {
    const now = new Date();
    return prisma.questionnaire.update({
      where: { id },
      data:
        status === "PUBLISHED"
          ? { status, publishedAt: now, closedAt: null }
          : status === "CLOSED"
            ? { status, closedAt: now }
            : status === "ARCHIVED"
              ? { status, publishedAt: null }
              : { status, publishedAt: null, closedAt: null },
      select: cmsQuestionnaireDetailSelect,
    });
  },
  delete(id: string) {
    return prisma.questionnaire.delete({ where: { id } });
  },
};
