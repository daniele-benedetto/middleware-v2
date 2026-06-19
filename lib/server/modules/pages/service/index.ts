import "server-only";

import { createCmsDomainErrorDetails } from "@/lib/cms/errors/domain-error-details";
import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
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
  UpdatePageInput,
} from "@/lib/server/modules/pages/schema";

type PageRecord = {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PageDetailRecord = PageRecord & {
  contentRich: unknown;
};

const ensureSlug = (value: string): string => {
  const slug = normalizeSlug(value);

  if (!slug) {
    throw new ApiError(400, "VALIDATION_ERROR", "Slug is required");
  }

  return slug;
};

const toPageDto = (page: PageRecord): PageDto => ({
  id: page.id,
  title: page.title,
  slug: page.slug,
  status: page.status,
  publishedAt: page.publishedAt?.toISOString() ?? null,
  createdAt: page.createdAt.toISOString(),
  updatedAt: page.updatedAt.toISOString(),
});

const toPageDetailDto = (page: PageDetailRecord): PageDetailDto => ({
  ...toPageDto(page),
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
