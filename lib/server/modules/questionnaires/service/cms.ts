import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import {
  revalidatePublicQuestionnaireAnalysisContent,
  revalidatePublicQuestionnaireInviteContent,
} from "@/lib/public/server/revalidation";
import { ApiError } from "@/lib/server/http/api-error";
import { createQuestionnaireResponsesCsv } from "@/lib/server/modules/questionnaires/csv";
import {
  cmsQuestionnairesRepository,
  questionnaireResponsesRepository,
} from "@/lib/server/modules/questionnaires/repository";
import {
  questionnaireDefinitionSchema,
  questionnaireHomeVariantSchema,
} from "@/lib/server/modules/questionnaires/schema";
import {
  createResponsesTimeline,
  filterResponsesByRule,
  findQuestionnaireField,
  isFreeTextQuestionnaireField,
  listFreeTextFieldAnswers,
  summarizeQuestionnaireFields,
} from "@/lib/server/modules/questionnaires/service/summary";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { QuestionnaireStatus } from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  CreateQuestionnaireInput,
  ListQuestionnaireResponsesFilter,
  ListQuestionnairesQuery,
  UpdateQuestionnaireInput,
} from "@/lib/server/modules/questionnaires/schema";
import type { QuestionnaireRule } from "@/lib/server/modules/questionnaires/schema/definition";

type CmsQuestionnaireRecord = {
  id: string;
  title: string;
  titleStyled?: unknown;
  homeVariant?: string;
  slug: string;
  status: QuestionnaireStatus;
  publishedAt: Date | null;
  closedAt: Date | null;
  firstResponseAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { responses: number };
  descriptionRich?: unknown;
  definition?: unknown;
};

function slug(value: string) {
  const result = normalizeSlug(value);
  if (!result) throw new ApiError(400, "VALIDATION_ERROR", "Slug is required");
  return result;
}
function dto(record: CmsQuestionnaireRecord) {
  return {
    id: record.id,
    title: record.title,
    titleStyled:
      (record.titleStyled as
        | import("@/lib/server/modules/issues/schema").IssueTitleStyled
        | null) ?? null,
    homeVariant: questionnaireHomeVariantSchema.parse(record.homeVariant ?? "black"),
    slug: record.slug,
    status: record.status,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    closedAt: record.closedAt?.toISOString() ?? null,
    firstResponseAt: record.firstResponseAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    responseCount: record._count.responses,
  };
}
function detail(record: CmsQuestionnaireRecord) {
  const definition = questionnaireDefinitionSchema.parse(record.definition);
  return { ...dto(record), descriptionRich: record.descriptionRich ?? null, definition };
}
function map(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
    throw new ApiError(404, "NOT_FOUND", "Questionnaire not found");
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    throw new ApiError(409, "CONFLICT", "Questionnaire slug already exists");
  throw error;
}

export const cmsQuestionnairesService = {
  async list(query: ListQuestionnairesQuery, pagination: PaginationParams) {
    const [items, total] = await Promise.all([
      cmsQuestionnairesRepository.list(query, pagination),
      cmsQuestionnairesRepository.count(query),
    ]);
    return { items: items.map(dto), total };
  },
  async getById(id: string) {
    const record = await cmsQuestionnairesRepository.getById(id);
    if (!record) throw new ApiError(404, "NOT_FOUND", "Questionnaire not found");
    return detail(record);
  },
  async create(input: CreateQuestionnaireInput) {
    try {
      return detail(await cmsQuestionnairesRepository.create({ ...input, slug: slug(input.slug) }));
    } catch (error) {
      map(error);
    }
  },
  async update(id: string, input: UpdateQuestionnaireInput) {
    const current = await cmsQuestionnairesRepository.getById(id);
    if (!current) throw new ApiError(404, "NOT_FOUND", "Questionnaire not found");
    if (input.definition && current.firstResponseAt) {
      const previous = questionnaireDefinitionSchema.parse(current.definition);
      const next = questionnaireDefinitionSchema.parse(input.definition);
      const { copy: _previousCopy, ...previousStructure } = previous;
      const { copy: _nextCopy, ...nextStructure } = next;
      if (JSON.stringify(previousStructure) !== JSON.stringify(nextStructure))
        throw new ApiError(
          409,
          "CONFLICT",
          "Questionnaire structure is locked after the first response",
        );
    }
    try {
      const result = detail(
        await cmsQuestionnairesRepository.update(id, {
          ...input,
          slug: input.slug ? slug(input.slug) : undefined,
        }),
      );
      if (current.status === "CLOSED") revalidatePublicQuestionnaireAnalysisContent(id);
      if (current.status === "PUBLISHED") revalidatePublicQuestionnaireInviteContent(id);
      return result;
    } catch (error) {
      map(error);
    }
  },
  async transition(id: string, action: "publish" | "close" | "archive" | "restore") {
    const current = await cmsQuestionnairesRepository.getById(id);
    if (!current) throw new ApiError(404, "NOT_FOUND", "Questionnaire not found");
    const allowed =
      (action === "publish" && current.status === "DRAFT") ||
      (action === "close" && current.status === "PUBLISHED") ||
      (action === "archive" && current.status !== "ARCHIVED") ||
      (action === "restore" && current.status === "ARCHIVED");
    if (!allowed) throw new ApiError(409, "CONFLICT", "Invalid questionnaire status transition");
    try {
      const result = detail(
        await cmsQuestionnairesRepository.transition(
          id,
          action === "publish"
            ? "PUBLISHED"
            : action === "close"
              ? "CLOSED"
              : action === "archive"
                ? "ARCHIVED"
                : "DRAFT",
        ),
      );
      revalidatePublicQuestionnaireAnalysisContent(id);
      revalidatePublicQuestionnaireInviteContent(id);
      return result;
    } catch (error) {
      map(error);
    }
  },
  async delete(id: string) {
    try {
      await cmsQuestionnairesRepository.delete(id);
      revalidatePublicQuestionnaireAnalysisContent(id);
      revalidatePublicQuestionnaireInviteContent(id);
    } catch (error) {
      map(error);
    }
  },
  async listResponses(
    questionnaireId: string,
    filter: ListQuestionnaireResponsesFilter,
    pagination: PaginationParams,
  ) {
    const range = {
      submittedFrom: filter.submittedFrom ? new Date(filter.submittedFrom) : undefined,
      submittedTo: filter.submittedTo ? new Date(filter.submittedTo) : undefined,
    };
    const [items, total] = await Promise.all([
      questionnaireResponsesRepository.listForCms(questionnaireId, range, pagination),
      questionnaireResponsesRepository.countForCms(questionnaireId, range),
    ]);
    return {
      items: items.map((item) => ({ ...item, submittedAt: item.submittedAt.toISOString() })),
      total,
    };
  },
  async getResponseById(id: string, questionnaireId?: string) {
    const item = await questionnaireResponsesRepository.getByIdForCms(id, questionnaireId);
    if (!item) throw new ApiError(404, "NOT_FOUND", "Questionnaire response not found");
    const adjacent = await questionnaireResponsesRepository.getAdjacentIdsForCms(item);
    return {
      id: item.id,
      questionnaireId: item.questionnaireId,
      schemaVersion: item.schemaVersion,
      definitionSnapshot: questionnaireDefinitionSchema.parse(item.definitionSnapshot),
      answers: item.answers,
      submittedAt: item.submittedAt.toISOString(),
      previousResponseId: adjacent.previousId,
      nextResponseId: adjacent.nextId,
    };
  },
  async getSummary(id: string, filter?: QuestionnaireRule) {
    const record = await cmsQuestionnairesRepository.getWithResponsesForResults(id);
    if (!record) throw new ApiError(404, "NOT_FOUND", "Questionnaire not found");
    const definition = questionnaireDefinitionSchema.parse(record.definition);
    const responses = filterResponsesByRule(definition, record.responses, filter);
    return {
      id: record.id,
      status: record.status,
      publishedAt: record.publishedAt?.toISOString() ?? null,
      closedAt: record.closedAt?.toISOString() ?? null,
      responseCount: responses.length,
      totalResponseCount: record.responses.length,
      firstResponseAt: responses[0]?.submittedAt.toISOString() ?? null,
      lastResponseAt: responses.at(-1)?.submittedAt.toISOString() ?? null,
      timeline: createResponsesTimeline(responses.map((response) => response.submittedAt)),
      fields: summarizeQuestionnaireFields(definition, responses),
    };
  },
  async listFieldAnswers(questionnaireId: string, fieldId: string, pagination: PaginationParams) {
    const record = await cmsQuestionnairesRepository.getWithResponsesForResults(questionnaireId);
    if (!record) throw new ApiError(404, "NOT_FOUND", "Questionnaire not found");
    const match = findQuestionnaireField(
      questionnaireDefinitionSchema.parse(record.definition),
      fieldId,
    );
    if (!match) throw new ApiError(404, "NOT_FOUND", "Questionnaire field not found");
    if (!isFreeTextQuestionnaireField(match.field))
      throw new ApiError(400, "VALIDATION_ERROR", "Questionnaire field is not a free-text field");
    const answers = listFreeTextFieldAnswers(fieldId, record.responses);
    const offset = (pagination.page - 1) * pagination.pageSize;
    return {
      field: {
        id: match.field.id,
        type: match.field.type,
        label: match.field.label,
        stepTitle: match.stepTitle,
      },
      items: answers.slice(offset, offset + pagination.pageSize),
      total: answers.length,
    };
  },
  async exportResponsesCsv(questionnaireId: string) {
    const questionnaire = await cmsQuestionnairesRepository.getById(questionnaireId);
    if (!questionnaire) throw new ApiError(404, "NOT_FOUND", "Questionnaire not found");
    const responses = await questionnaireResponsesRepository.listByQuestionnaireId(questionnaireId);
    return {
      filename: `questionnaire-${slug(questionnaire.slug)}-responses.csv`,
      content: createQuestionnaireResponsesCsv(
        responses.map((response) => ({
          id: response.id,
          schemaVersion: response.schemaVersion,
          definitionSnapshot: response.definitionSnapshot,
          answers: response.answers as Record<string, unknown>,
          submittedAt: response.submittedAt,
        })),
      ),
    };
  },
};
