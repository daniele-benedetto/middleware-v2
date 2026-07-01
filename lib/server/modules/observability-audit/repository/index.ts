import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type {
  AuditChangeType as PrismaAuditChangeType,
  AuditOutcome as PrismaAuditOutcome,
  AuditRiskLevel as PrismaAuditRiskLevel,
} from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type { ListObservabilityAuditQuery } from "@/lib/server/modules/observability-audit/schema";
import type { AuditChangeInput } from "@/lib/server/modules/observability-audit/types";

const AUDIT_ACTIVITY_SELECT = {
  id: true,
  actorId: true,
  actorSnapshot: true,
  action: true,
  resourceType: true,
  resourceId: true,
  resourceSnapshot: true,
  outcome: true,
  riskLevel: true,
  riskReasons: true,
  changedFields: true,
  beforeSummary: true,
  afterSummary: true,
  attemptedSummary: true,
  publicImpact: true,
  requestId: true,
  correlationId: true,
  reason: true,
  errorCode: true,
  errorMessage: true,
  metadata: true,
  createdAt: true,
} as const satisfies Prisma.AuditActivitySelect;

const AUDIT_CHANGE_SELECT = {
  id: true,
  field: true,
  beforeValueRedacted: true,
  afterValueRedacted: true,
  changeType: true,
  createdAt: true,
} as const satisfies Prisma.AuditChangeSelect;

export type AuditActivityRecord = Prisma.AuditActivityGetPayload<{
  select: typeof AUDIT_ACTIVITY_SELECT;
}>;

export type AuditActivityDetailRecord = Prisma.AuditActivityGetPayload<{
  select: typeof AUDIT_ACTIVITY_SELECT & {
    changes: { orderBy: { field: "asc" }; select: typeof AUDIT_CHANGE_SELECT };
  };
}>;

export type CreateAuditActivityEntry = {
  actorId?: string | null;
  actorSnapshot?: Prisma.InputJsonValue | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  resourceSnapshot?: Prisma.InputJsonValue | null;
  outcome: "SUCCESS" | "FAILURE";
  riskLevel: "low" | "medium" | "high" | "critical";
  riskReasons: Prisma.InputJsonValue;
  changedFields: string[];
  beforeSummary?: Prisma.InputJsonValue | null;
  afterSummary?: Prisma.InputJsonValue | null;
  attemptedSummary?: Prisma.InputJsonValue | null;
  publicImpact: boolean;
  requestId?: string | null;
  correlationId?: string | null;
  reason?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  changes: AuditChangeInput[];
};

function toPrismaOutcome(value: "SUCCESS" | "FAILURE") {
  return value as PrismaAuditOutcome;
}

function toPrismaRiskLevel(value: CreateAuditActivityEntry["riskLevel"]) {
  return value.toUpperCase() as PrismaAuditRiskLevel;
}

function toPrismaChangeType(value: AuditChangeInput["changeType"]) {
  return value.toUpperCase() as PrismaAuditChangeType;
}

function readDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toAuditWhereInput(query: ListObservabilityAuditQuery): Prisma.AuditActivityWhereInput {
  return {
    actorId: query.actorId,
    resourceType: query.resourceType,
    action: query.action,
    outcome: query.outcome ? toPrismaOutcome(query.outcome) : undefined,
    riskLevel: query.riskLevel ? toPrismaRiskLevel(query.riskLevel) : undefined,
    publicImpact: query.publicImpact,
    requestId: query.requestId ? { contains: query.requestId, mode: "insensitive" } : undefined,
    correlationId: query.correlationId
      ? { contains: query.correlationId, mode: "insensitive" }
      : undefined,
    createdAt:
      query.from || query.to
        ? {
            gte: readDate(query.from),
            lte: readDate(query.to),
          }
        : undefined,
    OR: query.q
      ? [
          { action: { contains: query.q, mode: "insensitive" } },
          { resourceType: { contains: query.q, mode: "insensitive" } },
          { resourceId: { contains: query.q, mode: "insensitive" } },
          { requestId: { contains: query.q, mode: "insensitive" } },
          { correlationId: { contains: query.q, mode: "insensitive" } },
          { errorCode: { contains: query.q, mode: "insensitive" } },
          { errorMessage: { contains: query.q, mode: "insensitive" } },
        ]
      : undefined,
  };
}

function toAuditOrderByInput(
  query: ListObservabilityAuditQuery,
): Prisma.AuditActivityOrderByWithRelationInput[] {
  if (query.sortBy === "riskLevel") {
    return [{ riskLevel: query.sortOrder }, { createdAt: "desc" }];
  }

  return [{ [query.sortBy]: query.sortOrder }];
}

export const observabilityAuditRepository = {
  async create(entry: CreateAuditActivityEntry) {
    return prisma.$transaction(async (tx) => {
      const activity = await tx.auditActivity.create({
        data: {
          actorId: entry.actorId ?? null,
          actorSnapshot: entry.actorSnapshot ?? undefined,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId ?? null,
          resourceSnapshot: entry.resourceSnapshot ?? undefined,
          outcome: toPrismaOutcome(entry.outcome),
          riskLevel: toPrismaRiskLevel(entry.riskLevel),
          riskReasons: entry.riskReasons,
          changedFields: entry.changedFields,
          beforeSummary: entry.beforeSummary ?? undefined,
          afterSummary: entry.afterSummary ?? undefined,
          attemptedSummary: entry.attemptedSummary ?? undefined,
          publicImpact: entry.publicImpact,
          requestId: entry.requestId ?? null,
          correlationId: entry.correlationId ?? null,
          reason: entry.reason ?? null,
          errorCode: entry.errorCode ?? null,
          errorMessage: entry.errorMessage ?? null,
          metadata: entry.metadata ?? undefined,
        },
        select: AUDIT_ACTIVITY_SELECT,
      });

      if (entry.outcome === "SUCCESS" && entry.changes.length > 0) {
        await tx.auditChange.createMany({
          data: entry.changes.map((change) => ({
            auditActivityId: activity.id,
            field: change.field,
            beforeValueRedacted: change.beforeValueRedacted ?? undefined,
            afterValueRedacted: change.afterValueRedacted ?? undefined,
            changeType: toPrismaChangeType(change.changeType),
          })),
        });
      }

      return activity;
    });
  },

  async list(query: ListObservabilityAuditQuery, pagination: PaginationParams) {
    return prisma.auditActivity.findMany({
      where: toAuditWhereInput(query),
      orderBy: toAuditOrderByInput(query),
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: AUDIT_ACTIVITY_SELECT,
    });
  },

  async count(query: ListObservabilityAuditQuery) {
    return prisma.auditActivity.count({ where: toAuditWhereInput(query) });
  },

  async summary(from?: Date) {
    const since = from ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const where = { createdAt: { gte: since } } satisfies Prisma.AuditActivityWhereInput;

    const [highRiskCount, publicImpactCount, failureCount, activeActors, sensitiveActionCount] =
      await Promise.all([
        prisma.auditActivity.count({
          where: { ...where, riskLevel: { in: ["HIGH", "CRITICAL"] } },
        }),
        prisma.auditActivity.count({ where: { ...where, publicImpact: true } }),
        prisma.auditActivity.count({ where: { ...where, outcome: "FAILURE" } }),
        prisma.auditActivity.findMany({
          where: { ...where, actorId: { not: null } },
          distinct: ["actorId"],
          select: { actorId: true },
        }),
        prisma.auditActivity.count({
          where: {
            ...where,
            OR: [
              { riskLevel: "CRITICAL" },
              { action: { in: ["publish", "unpublish", "delete", "change_role"] } },
            ],
          },
        }),
      ]);

    return {
      highRiskCount,
      publicImpactCount,
      failureCount,
      activeActorCount: activeActors.length,
      sensitiveActionCount,
    };
  },

  async getById(id: string) {
    return prisma.auditActivity.findUnique({
      where: { id },
      select: {
        ...AUDIT_ACTIVITY_SELECT,
        changes: {
          orderBy: { field: "asc" },
          select: AUDIT_CHANGE_SELECT,
        },
      },
    });
  },

  async listRelatedErrors(requestId?: string | null, correlationId?: string | null) {
    if (!requestId && !correlationId) return [];
    const occurrenceFilters: Prisma.ErrorOccurrenceWhereInput[] = [];
    if (requestId) occurrenceFilters.push({ requestId });
    if (correlationId) occurrenceFilters.push({ correlationId });

    return prisma.errorGroup.findMany({
      where: {
        occurrences: {
          some: {
            OR: occurrenceFilters,
          },
        },
      },
      orderBy: { lastSeenAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        lastSeenAt: true,
      },
    });
  },
};
