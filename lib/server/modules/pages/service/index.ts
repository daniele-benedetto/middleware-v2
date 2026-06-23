import "server-only";

import { createCmsDomainErrorDetails } from "@/lib/cms/errors/domain-error-details";
import { Prisma } from "@/lib/generated/prisma/client";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import { pagesRepository } from "@/lib/server/modules/pages/repository";
import { assertPublishedAtConsistency } from "@/lib/server/validation/published";
import { normalizeSlug } from "@/lib/server/validation/slug";

import type { PageStatus } from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type { PageDetailDto, PageDto } from "@/lib/server/modules/pages/dto";
import type {
  CreatePagePersistInput,
  UpdatePagePersistInput,
} from "@/lib/server/modules/pages/repository";
import type {
  CreatePageInput,
  ListPagesQuery,
  PageTitleStyled,
  UpdatePageInput,
} from "@/lib/server/modules/pages/schema";

type PageRecord = {
  id: string;
  title: string;
  titleStyled: unknown;
  slug: string;
  excerpt: string | null;
  status: PageStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PageDetailRecord = PageRecord & {
  excerptRich: unknown;
  contentRich: unknown;
};

const ensureSlug = (value: string): string => {
  const slug = normalizeSlug(value);

  if (!slug) {
    throw new ApiError(400, "VALIDATION_ERROR", "Slug is required");
  }

  return slug;
};

function createRichTextDocFromPlainText(value: string): unknown {
  const paragraphs = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    }));

  return {
    type: "doc",
    content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph" }],
  };
}

function toCreateExcerptPersist(
  input: CreatePageInput,
): Pick<CreatePagePersistInput, "excerpt" | "excerptRich"> {
  if (input.excerptRich === undefined) {
    return {};
  }

  return {
    excerpt: extractPlainText(input.excerptRich) ?? undefined,
    excerptRich: input.excerptRich,
  };
}

function toUpdateExcerptPersist(
  input: UpdatePageInput,
): Pick<UpdatePagePersistInput, "excerpt" | "excerptRich"> {
  if (input.excerptRich === undefined) {
    return {};
  }

  return {
    excerpt: extractPlainText(input.excerptRich),
    excerptRich: input.excerptRich,
  };
}

const toPageDto = (page: PageRecord): PageDto => ({
  id: page.id,
  title: page.title,
  titleStyled: parsePageTitleStyled(page.titleStyled),
  slug: page.slug,
  excerpt: page.excerpt,
  status: page.status,
  publishedAt: page.publishedAt?.toISOString() ?? null,
  createdAt: page.createdAt.toISOString(),
  updatedAt: page.updatedAt.toISOString(),
});

function parsePageTitleStyled(value: unknown): PageTitleStyled | null {
  const result = issueTitleStyledSchema.nullable().safeParse(value);
  return result.success ? result.data : null;
}

const toPageDetailDto = (page: PageDetailRecord): PageDetailDto => ({
  ...toPageDto(page),
  excerptRich:
    page.excerptRich ?? (page.excerpt ? createRichTextDocFromPlainText(page.excerpt) : null),
  contentRich: page.contentRich,
});

const isNotFoundError = (error: unknown): boolean => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
};

const isUniqueError = (error: unknown): boolean => {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
};

function mapUniqueError(error: unknown): never {
  if (isUniqueError(error)) {
    throw new ApiError(
      409,
      "CONFLICT",
      "Page slug already exists",
      createCmsDomainErrorDetails("PAGE_SLUG_EXISTS"),
    );
  }

  throw error;
}

export const pagesService = {
  async list(query: ListPagesQuery, pagination: PaginationParams) {
    const [pages, total] = await Promise.all([
      pagesRepository.list(query, pagination),
      pagesRepository.count(query),
    ]);

    return { items: pages.map(toPageDto), total };
  },
  async getById(id: string) {
    const page = await pagesRepository.getById(id);

    if (!page) {
      throw new ApiError(404, "NOT_FOUND", "Page not found");
    }

    return toPageDetailDto(page as PageDetailRecord);
  },
  async create(input: CreatePageInput) {
    const publishedAt = input.publishedAt ?? null;
    assertPublishedAtConsistency(input.status, publishedAt);

    const normalizedInput: CreatePagePersistInput = {
      ...input,
      slug: ensureSlug(input.slug),
      ...toCreateExcerptPersist(input),
      publishedAt,
    };

    try {
      const page = await pagesRepository.create(normalizedInput);
      return toPageDto(page);
    } catch (error) {
      mapUniqueError(error);
    }
  },
  async update(id: string, input: UpdatePageInput) {
    const current = await pagesRepository.getById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Page not found");
    }

    const normalizedInput: UpdatePagePersistInput = {
      ...input,
      slug: input.slug ? ensureSlug(input.slug) : undefined,
      ...toUpdateExcerptPersist(input),
    };
    const nextStatus = normalizedInput.status ?? current.status;
    const nextPublishedAt =
      normalizedInput.publishedAt === undefined ? current.publishedAt : normalizedInput.publishedAt;

    assertPublishedAtConsistency(nextStatus, nextPublishedAt ?? null);

    try {
      const page = await pagesRepository.update(id, normalizedInput);
      return toPageDto(page);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Page not found");
      }

      mapUniqueError(error);
    }
  },
  async delete(id: string) {
    try {
      await pagesRepository.delete(id);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Page not found");
      }

      throw error;
    }
  },
  async publish(id: string) {
    try {
      return toPageDto(await pagesRepository.publish(id));
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Page not found");
      }

      throw error;
    }
  },
  async unpublish(id: string) {
    try {
      return toPageDto(await pagesRepository.unpublish(id));
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Page not found");
      }

      throw error;
    }
  },
  async archive(id: string) {
    try {
      return toPageDto(await pagesRepository.archive(id));
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new ApiError(404, "NOT_FOUND", "Page not found");
      }

      throw error;
    }
  },
};
