import "server-only";

import { BlobNotFoundError } from "@vercel/blob";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import { articlesRepository } from "@/lib/server/modules/articles/repository";
import { auditLogsRepository } from "@/lib/server/modules/audit-logs/repository";
import { categoriesRepository } from "@/lib/server/modules/categories/repository";
import { issuesRepository } from "@/lib/server/modules/issues/repository";
import { mediaRepository } from "@/lib/server/modules/media/repository";
import { tagsRepository } from "@/lib/server/modules/tags/repository";
import { usersRepository } from "@/lib/server/modules/users/repository";

import type { AuditLogOutcomeValue, AuditLogResourceValue } from "@/lib/audit-logs/constants";
import type { UserRole } from "@/lib/server/auth/roles";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type { AuditLogDetailDto, AuditLogDto } from "@/lib/server/modules/audit-logs/dto";
import type { ListAuditLogsQuery } from "@/lib/server/modules/audit-logs/schema";
import type { CreateAuditLogEntry } from "@/lib/server/modules/audit-logs/types";

type AuditLogRecord = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: UserRole | null;
  action: string;
  resource: AuditLogResourceValue;
  resourceId: string | null;
  outcome: AuditLogOutcomeValue;
  errorCode: string | null;
  errorMessage: string | null;
  method: string;
  path: string;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: unknown;
  createdAt: Date;
};

type AuditActorRecord = {
  id: string;
  name: string | null;
  email: string;
};

type AuditLogResourceField = {
  label: string;
  value: string;
};

type AuditLogResourceSummary = NonNullable<AuditLogDetailDto["resourceSummary"]>;

function isAuditLogStorageUnavailable(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

function formatBoolean(value: boolean) {
  return value ? "Si" : "No";
}

function formatNullableDate(value: Date | null | undefined) {
  return value ? value.toISOString() : "-";
}

function buildFields(fields: Array<AuditLogResourceField | null>): AuditLogResourceField[] {
  return fields.filter((field): field is AuditLogResourceField => field !== null);
}

function buildMissingResourceSummary(label: string, resourceId: string): AuditLogResourceSummary {
  return {
    title: `${label} non disponibile`,
    description: "La risorsa non esiste piu oppure non e accessibile nello stato corrente.",
    missing: true,
    fields: [{ label: "ID", value: resourceId }],
  };
}

async function buildActorDisplayNameMap(actorIds: string[]) {
  const actors = await usersRepository.listIdentityByIds(actorIds);

  return new Map(
    actors.map((actor) => {
      const typedActor = actor as AuditActorRecord;
      return [typedActor.id, typedActor.name?.trim() || typedActor.email] as const;
    }),
  );
}

async function resolveActorDisplayName(actorId: string | null, actorEmail: string | null) {
  if (!actorId) {
    return actorEmail;
  }

  const actorMap = await buildActorDisplayNameMap([actorId]);
  return actorMap.get(actorId) ?? actorEmail;
}

async function resolveCategorySummary(resourceId: string): Promise<AuditLogResourceSummary> {
  const category = await categoriesRepository.getById(resourceId);

  if (!category) {
    return buildMissingResourceSummary("Categoria", resourceId);
  }

  return {
    title: category.name,
    description: "Categoria editoriale corrente.",
    missing: false,
    fields: buildFields([
      { label: "ID", value: category.id },
      { label: "Slug", value: category.slug },
      { label: "Attiva", value: formatBoolean(category.isActive) },
      { label: "Articoli collegati", value: String(category._count?.articles ?? 0) },
    ]),
  };
}

async function resolveTagSummary(resourceId: string): Promise<AuditLogResourceSummary> {
  const tag = await tagsRepository.getById(resourceId);

  if (!tag) {
    return buildMissingResourceSummary("Tag", resourceId);
  }

  return {
    title: tag.name,
    description: "Tag editoriale corrente.",
    missing: false,
    fields: buildFields([
      { label: "ID", value: tag.id },
      { label: "Slug", value: tag.slug },
      { label: "Attivo", value: formatBoolean(tag.isActive) },
      { label: "Articoli collegati", value: String(tag._count?.articles ?? 0) },
    ]),
  };
}

async function resolveIssueSummary(resourceId: string): Promise<AuditLogResourceSummary> {
  const issue = await issuesRepository.getById(resourceId);

  if (!issue) {
    return buildMissingResourceSummary("Issue", resourceId);
  }

  return {
    title: issue.title,
    description: "Issue editoriale corrente.",
    missing: false,
    fields: buildFields([
      { label: "ID", value: issue.id },
      { label: "Slug", value: issue.slug },
      { label: "Attiva", value: formatBoolean(issue.isActive) },
      { label: "Ordine", value: String(issue.sortOrder) },
      { label: "Pubblicata", value: formatNullableDate(issue.publishedAt) },
      { label: "Articoli collegati", value: String(issue._count?.articles ?? 0) },
    ]),
  };
}

async function resolveUserSummary(resourceId: string): Promise<AuditLogResourceSummary> {
  const user = await usersRepository.getById(resourceId);

  if (!user) {
    return buildMissingResourceSummary("Utente", resourceId);
  }

  return {
    title: user.email,
    description: user.name ?? "Utente CMS corrente.",
    missing: false,
    fields: buildFields([
      { label: "ID", value: user.id },
      user.name ? { label: "Nome", value: user.name } : null,
      { label: "Ruolo", value: user.role },
      { label: "Email verificata", value: formatBoolean(user.emailVerified) },
      { label: "Articoli firmati", value: String(user._count?.authoredArticles ?? 0) },
    ]),
  };
}

async function resolveArticleSummary(resourceId: string): Promise<AuditLogResourceSummary> {
  const article = await articlesRepository.getById(resourceId);

  if (!article) {
    return buildMissingResourceSummary("Articolo", resourceId);
  }

  return {
    title: article.title,
    description: "Articolo editoriale corrente.",
    missing: false,
    fields: buildFields([
      { label: "ID", value: article.id },
      { label: "Slug", value: article.slug },
      { label: "Stato", value: article.status },
      { label: "Issue", value: article.issue.title },
      { label: "Categoria", value: article.category.name },
      { label: "Autore", value: article.author.name ?? article.author.email },
      { label: "Pubblicato", value: formatNullableDate(article.publishedAt) },
      { label: "Featured", value: formatBoolean(article.isFeatured) },
      { label: "Posizione", value: String(article.position) },
      { label: "Tag", value: String(article._count?.tags ?? 0) },
    ]),
  };
}

async function resolveMediaSummary(resourceId: string): Promise<AuditLogResourceSummary> {
  try {
    const media = await mediaRepository.head(resourceId);

    return {
      title: media.pathname,
      description: "Asset Vercel Blob corrente.",
      missing: false,
      fields: buildFields([
        { label: "URL", value: media.url },
        { label: "Tipo", value: media.contentType ?? "-" },
        { label: "Dimensione", value: String(media.size) },
        { label: "Caricato", value: media.uploadedAt.toISOString() },
      ]),
    };
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return buildMissingResourceSummary("Media", resourceId);
    }

    throw error;
  }
}

async function resolveResourceSummary(
  resource: AuditLogResourceValue,
  resourceId: string | null,
): Promise<AuditLogResourceSummary | null> {
  if (!resourceId) {
    return null;
  }

  if (resource === "categories") {
    return resolveCategorySummary(resourceId);
  }

  if (resource === "tags") {
    return resolveTagSummary(resourceId);
  }

  if (resource === "issues") {
    return resolveIssueSummary(resourceId);
  }

  if (resource === "users") {
    return resolveUserSummary(resourceId);
  }

  if (resource === "articles") {
    return resolveArticleSummary(resourceId);
  }

  if (resource === "media") {
    return resolveMediaSummary(resourceId);
  }

  return buildMissingResourceSummary("Risorsa", resourceId);
}

function toAuditLogDto(
  record: AuditLogRecord,
  actorDisplayName: string | null = record.actorEmail,
): AuditLogDto {
  return {
    id: record.id,
    actorId: record.actorId,
    actorDisplayName,
    actorEmail: record.actorEmail,
    actorRole: record.actorRole,
    action: record.action,
    resource: record.resource,
    resourceId: record.resourceId,
    outcome: record.outcome,
    errorCode: record.errorCode,
    errorMessage: record.errorMessage,
    method: record.method,
    path: record.path,
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
    requestId: record.requestId,
    metadata: record.metadata ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

export const auditLogsService = {
  async list(query: ListAuditLogsQuery, pagination: PaginationParams) {
    try {
      const [items, total] = await Promise.all([
        auditLogsRepository.list(query, pagination),
        auditLogsRepository.count(query),
      ]);
      const actorIds = Array.from(
        new Set(
          items.map((item) => item.actorId).filter((value): value is string => Boolean(value)),
        ),
      );
      const actorDisplayNameMap = await buildActorDisplayNameMap(actorIds);

      return {
        items: items.map((item) => {
          const typedItem = item as AuditLogRecord;

          return toAuditLogDto(
            typedItem,
            typedItem.actorId
              ? (actorDisplayNameMap.get(typedItem.actorId) ?? typedItem.actorEmail)
              : typedItem.actorEmail,
          );
        }),
        total,
      };
    } catch (error) {
      if (isAuditLogStorageUnavailable(error)) {
        return {
          items: [],
          total: 0,
        };
      }

      throw error;
    }
  },
  async record(entry: CreateAuditLogEntry) {
    return auditLogsRepository.create(entry);
  },
  async getById(id: string): Promise<AuditLogDetailDto> {
    const item = await auditLogsRepository.getById(id);

    if (!item) {
      throw new ApiError(404, "NOT_FOUND", "Audit log not found");
    }

    const typedItem = item as AuditLogRecord;
    const dto = toAuditLogDto(
      typedItem,
      await resolveActorDisplayName(typedItem.actorId, typedItem.actorEmail),
    );

    return {
      ...dto,
      resourceSummary: await resolveResourceSummary(dto.resource, dto.resourceId),
    };
  },
};
