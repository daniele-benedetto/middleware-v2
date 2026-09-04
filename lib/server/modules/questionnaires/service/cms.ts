import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import {
  cmsQuestionnairesRepository,
  questionnaireResponsesRepository,
} from "@/lib/server/modules/questionnaires/repository";
import { questionnaireDefinitionSchema } from "@/lib/server/modules/questionnaires/schema";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { QuestionnaireStatus } from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  CreateQuestionnaireInput,
  ListQuestionnairesQuery,
  UpdateQuestionnaireInput,
} from "@/lib/server/modules/questionnaires/schema";

type CmsQuestionnaireRecord = {
  id: string;
  title: string;
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
      return detail(
        await cmsQuestionnairesRepository.update(id, {
          ...input,
          slug: input.slug ? slug(input.slug) : undefined,
        }),
      );
    } catch (error) {
      map(error);
    }
  },
  async transition(id: string, action: "publish" | "close" | "archive") {
    const current = await cmsQuestionnairesRepository.getById(id);
    if (!current) throw new ApiError(404, "NOT_FOUND", "Questionnaire not found");
    const allowed =
      (action === "publish" && current.status === "DRAFT") ||
      (action === "close" && current.status === "PUBLISHED") ||
      (action === "archive" && current.status !== "ARCHIVED");
    if (!allowed) throw new ApiError(409, "CONFLICT", "Invalid questionnaire status transition");
    try {
      return detail(
        await cmsQuestionnairesRepository.transition(
          id,
          action === "publish" ? "PUBLISHED" : action === "close" ? "CLOSED" : "ARCHIVED",
        ),
      );
    } catch (error) {
      map(error);
    }
  },
  async delete(id: string) {
    try {
      await cmsQuestionnairesRepository.delete(id);
    } catch (error) {
      map(error);
    }
  },
  async listResponses(questionnaireId: string, pagination: PaginationParams) {
    const [items, total] = await Promise.all([
      questionnaireResponsesRepository.listForCms(questionnaireId, pagination),
      questionnaireResponsesRepository.countForCms(questionnaireId),
    ]);
    return {
      items: items.map((item) => ({ ...item, submittedAt: item.submittedAt.toISOString() })),
      total,
    };
  },
  async getResponseById(id: string) {
    const item = await questionnaireResponsesRepository.getByIdForCms(id);
    if (!item) throw new ApiError(404, "NOT_FOUND", "Questionnaire response not found");
    return {
      id: item.id,
      questionnaireId: item.questionnaireId,
      schemaVersion: item.schemaVersion,
      definitionSnapshot: questionnaireDefinitionSchema.parse(item.definitionSnapshot),
      answers: item.answers,
      submittedAt: item.submittedAt.toISOString(),
    };
  },
};
