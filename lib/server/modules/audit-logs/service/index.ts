import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { i18n } from "@/lib/i18n";
import { ApiError } from "@/lib/server/http/api-error";
import { articlesRepository } from "@/lib/server/modules/articles/repository";
import { auditLogsRepository } from "@/lib/server/modules/audit-logs/repository";
import { categoriesRepository } from "@/lib/server/modules/categories/repository";
import { issuesRepository } from "@/lib/server/modules/issues/repository";
import { mediaRepository } from "@/lib/server/modules/media/repository";
import { usersRepository } from "@/lib/server/modules/users/repository";
import { StorageNotFoundError } from "@/lib/server/storage/errors";

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
  return value ? i18n.cms.common.yes : i18n.cms.common.no;
}

function formatNullableDate(value: Date | null | undefined) {
  return value ? value.toISOString() : "-";
}

function buildFields(fields: Array<AuditLogResourceField | null>): AuditLogResourceField[] {
  return fields.filter((field): field is AuditLogResourceField => field !== null);
}

function buildMissingResourceSummary(label: string, resourceId: string): AuditLogResourceSummary {
  const text = i18n.cms.lists.auditLogs;

  return {
    title: text.resourceMissingTitle(label),
    description: text.resourceMissingDescription,
    missing: true,
    fields: [{ label: text.fields.id, value: resourceId }],
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
  const text = i18n.cms.lists.auditLogs;
  const category = await categoriesRepository.getById(resourceId);

  if (!category) {
    return buildMissingResourceSummary("Categoria", resourceId);
  }

  return {
    title: category.name,
    description: text.resourceCategoryDescription,
    missing: false,
    fields: buildFields([
      { label: text.fields.id, value: category.id },
      { label: text.fields.slug, value: category.slug },
      { label: text.fields.active, value: formatBoolean(category.isActive) },
      { label: text.fields.linkedArticles, value: String(category._count?.articles ?? 0) },
    ]),
  };
}

async function resolveIssueSummary(resourceId: string): Promise<AuditLogResourceSummary> {
  const text = i18n.cms.lists.auditLogs;
  const issue = await issuesRepository.getById(resourceId);

  if (!issue) {
    return buildMissingResourceSummary(text.resourceIssueLabel, resourceId);
  }

  return {
    title: issue.title,
    description: text.resourceIssueDescription,
    missing: false,
    fields: buildFields([
      { label: text.fields.id, value: issue.id },
      { label: text.fields.slug, value: issue.slug },
      { label: text.fields.active, value: formatBoolean(issue.isActive) },
      { label: text.fields.order, value: String(issue.sortOrder) },
      { label: text.fields.published, value: formatNullableDate(issue.publishedAt) },
      { label: text.fields.linkedArticles, value: String(issue._count?.articles ?? 0) },
    ]),
  };
}

async function resolveUserSummary(resourceId: string): Promise<AuditLogResourceSummary> {
  const text = i18n.cms.lists.auditLogs;
  const user = await usersRepository.getById(resourceId);

  if (!user) {
    return buildMissingResourceSummary("Utente", resourceId);
  }

  return {
    title: user.email,
    description: user.name ?? text.resourceUserDescription,
    missing: false,
    fields: buildFields([
      { label: text.fields.id, value: user.id },
      user.name ? { label: text.fields.name, value: user.name } : null,
      { label: text.fields.role, value: user.role },
      { label: text.fields.verifiedEmail, value: formatBoolean(user.emailVerified) },
    ]),
  };
}

async function resolveArticleSummary(resourceId: string): Promise<AuditLogResourceSummary> {
  const text = i18n.cms.lists.auditLogs;
  const article = await articlesRepository.getById(resourceId);

  if (!article) {
    return buildMissingResourceSummary("Articolo", resourceId);
  }

  return {
    title: article.title,
    description: text.resourceArticleDescription,
    missing: false,
    fields: buildFields([
      { label: text.fields.id, value: article.id },
      { label: text.fields.slug, value: article.slug },
      { label: text.fields.status, value: article.status },
      { label: text.fields.issue, value: article.issue.title },
      { label: text.fields.category, value: article.category.name },
      { label: text.fields.author, value: article.author?.name ?? "-" },
      { label: text.fields.publishedMasculine, value: formatNullableDate(article.publishedAt) },
    ]),
  };
}

async function resolveMediaSummary(resourceId: string): Promise<AuditLogResourceSummary> {
  const text = i18n.cms.lists.auditLogs;
  try {
    const media = await mediaRepository.head(resourceId);

    return {
      title: media.pathname,
      description: text.resourceMediaDescription,
      missing: false,
      fields: buildFields([
        { label: text.fields.url, value: media.url },
        { label: text.fields.type, value: media.contentType ?? "-" },
        { label: text.fields.size, value: String(media.size) },
        { label: text.fields.uploaded, value: media.uploadedAt.toISOString() },
      ]),
    };
  } catch (error) {
    if (error instanceof StorageNotFoundError) {
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
