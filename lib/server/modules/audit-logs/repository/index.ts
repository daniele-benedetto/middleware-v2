import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type { ListAuditLogsQuery } from "@/lib/server/modules/audit-logs/schema";
import type { CreateAuditLogEntry } from "@/lib/server/modules/audit-logs/types";

const AUDIT_LOG_LIST_SELECT = {
  id: true,
  actorId: true,
  actorEmail: true,
  actorRole: true,
  action: true,
  resource: true,
  resourceId: true,
  outcome: true,
  errorCode: true,
  errorMessage: true,
  method: true,
  path: true,
  ipAddress: true,
  userAgent: true,
  requestId: true,
  metadata: true,
  createdAt: true,
} as const satisfies Prisma.AuditLogSelect;

function toAuditLogWhereInput(query: ListAuditLogsQuery): Prisma.AuditLogWhereInput {
  return {
    outcome: query.outcome,
    resource: query.resource,
    OR: query.q
      ? [
          { actorEmail: { contains: query.q, mode: "insensitive" } },
          { action: { contains: query.q, mode: "insensitive" } },
          { resource: { contains: query.q, mode: "insensitive" } },
          { resourceId: { contains: query.q, mode: "insensitive" } },
          { path: { contains: query.q, mode: "insensitive" } },
          { requestId: { contains: query.q, mode: "insensitive" } },
          { errorCode: { contains: query.q, mode: "insensitive" } },
          { errorMessage: { contains: query.q, mode: "insensitive" } },
        ]
      : undefined,
  };
}

function toAuditLogOrderByInput(
  query: ListAuditLogsQuery,
): Prisma.AuditLogOrderByWithRelationInput {
  return {
    [query.sortBy]: query.sortOrder,
  };
}

export const auditLogsRepository = {
  async list(query: ListAuditLogsQuery, pagination: PaginationParams) {
    const where = toAuditLogWhereInput(query);
    const orderBy = toAuditLogOrderByInput(query);

    return prisma.auditLog.findMany({
      where,
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: AUDIT_LOG_LIST_SELECT,
    });
  },
  async count(query: ListAuditLogsQuery) {
    const where = toAuditLogWhereInput(query);
    return prisma.auditLog.count({ where });
  },
  async getById(id: string) {
    return prisma.auditLog.findUnique({
      where: { id },
      select: AUDIT_LOG_LIST_SELECT,
    });
  },
  async create(entry: CreateAuditLogEntry) {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail ?? null,
      actorRole: entry.actorRole ?? null,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId ?? null,
      outcome: entry.outcome,
      errorCode: entry.errorCode ?? null,
      errorMessage: entry.errorMessage ?? null,
      method: entry.method,
      path: entry.path,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      requestId: entry.requestId ?? null,
      metadata: entry.metadata,
    };

    return prisma.auditLog.create({ data });
  },
};
