import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type {
  ObservabilityErrorSeverity as PrismaObservabilityErrorSeverity,
  ObservabilityErrorSource as PrismaObservabilityErrorSource,
  ObservabilityErrorStatus as PrismaObservabilityErrorStatus,
  ObservabilityImpactArea as PrismaObservabilityImpactArea,
  ObservabilityUserImpact as PrismaObservabilityUserImpact,
} from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  ListObservabilityErrorsQuery,
  ObservabilityErrorStatus,
} from "@/lib/server/modules/observability-errors/schema";

const ERROR_GROUP_SELECT = {
  id: true,
  fingerprint: true,
  fingerprintVersion: true,
  errorSignature: true,
  title: true,
  source: true,
  severity: true,
  status: true,
  firstSeenAt: true,
  lastSeenAt: true,
  occurrenceCount: true,
  affectedSessions: true,
  affectedPaths: true,
  impactArea: true,
  userImpact: true,
  regression: true,
  priorityScore: true,
  priorityReasons: true,
  firstRelease: true,
  lastRelease: true,
  resolvedAt: true,
  resolvedBy: true,
  reopenedAt: true,
  reopenedBy: true,
  lastStatusAt: true,
  lastStatusBy: true,
} as const satisfies Prisma.ErrorGroupSelect;

const ERROR_OCCURRENCE_SELECT = {
  id: true,
  sessionId: true,
  requestId: true,
  correlationId: true,
  path: true,
  routePath: true,
  routeType: true,
  method: true,
  statusCode: true,
  actionContext: true,
  userAgent: true,
  deviceType: true,
  browser: true,
  os: true,
  stackTraceRedacted: true,
  metadata: true,
  occurredAt: true,
} as const satisfies Prisma.ErrorOccurrenceSelect;

export type RecordOperationalErrorEntry = {
  session?: {
    id: string;
    visitorHash: string;
    observedAt: Date;
    landingPath?: string | null;
    country?: string | null;
    userAgent?: string | null;
    isLikelyBot?: boolean;
  } | null;
  event: {
    sessionId?: string | null;
    visitorHash?: string | null;
    type: string;
    path?: string | null;
    pageType?: string | null;
    contentId?: string | null;
    contentType?: string | null;
    requestId?: string | null;
    correlationId?: string | null;
    release?: string | null;
    sampleRate: number;
    clientSequence?: number | null;
    clientElapsedMs?: number | null;
    metadata?: Prisma.InputJsonValue;
    receivedAtServer: Date;
  };
  group: {
    fingerprint: string;
    fingerprintVersion: number;
    errorSignature: string;
    title: string;
    source: PrismaObservabilityErrorSource;
    severity: PrismaObservabilityErrorSeverity;
    impactArea: PrismaObservabilityImpactArea;
    userImpact: PrismaObservabilityUserImpact;
    priorityScore: number;
    priorityReasons: Prisma.InputJsonValue;
    release?: string | null;
    path?: string | null;
  };
  occurrence: {
    sessionId?: string | null;
    requestId?: string | null;
    correlationId?: string | null;
    path?: string | null;
    routePath?: string | null;
    routeType?: string | null;
    method?: string | null;
    statusCode?: number | null;
    actionContext?: string | null;
    userAgent?: string | null;
    deviceType?: string | null;
    browser?: string | null;
    os?: string | null;
    stackTraceRedacted?: string | null;
    metadata?: Prisma.InputJsonValue;
    occurredAt: Date;
  };
};

function toPrismaSource(value: ListObservabilityErrorsQuery["source"]) {
  return value ? (value.toUpperCase() as PrismaObservabilityErrorSource) : undefined;
}

function toPrismaSeverity(value: ListObservabilityErrorsQuery["severity"]) {
  return value ? (value.toUpperCase() as PrismaObservabilityErrorSeverity) : undefined;
}

function toPrismaStatus(value: ObservabilityErrorStatus) {
  return value.toUpperCase() as PrismaObservabilityErrorStatus;
}

function toPrismaImpactArea(value: ListObservabilityErrorsQuery["impactArea"]) {
  return value ? (value.toUpperCase() as PrismaObservabilityImpactArea) : undefined;
}

function toPrismaUserImpact(value: ListObservabilityErrorsQuery["userImpact"]) {
  return value ? (value.toUpperCase() as PrismaObservabilityUserImpact) : undefined;
}

function readDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toErrorGroupWhereInput(query: ListObservabilityErrorsQuery): Prisma.ErrorGroupWhereInput {
  return {
    source: toPrismaSource(query.source),
    severity: toPrismaSeverity(query.severity),
    status: query.status ? toPrismaStatus(query.status) : undefined,
    impactArea: toPrismaImpactArea(query.impactArea),
    userImpact: toPrismaUserImpact(query.userImpact),
    regression: query.regression,
    OR: query.q
      ? [
          { title: { contains: query.q, mode: "insensitive" } },
          { fingerprint: { contains: query.q, mode: "insensitive" } },
          { errorSignature: { contains: query.q, mode: "insensitive" } },
          { occurrences: { some: { path: { contains: query.q, mode: "insensitive" } } } },
          { occurrences: { some: { routePath: { contains: query.q, mode: "insensitive" } } } },
          { occurrences: { some: { requestId: { contains: query.q, mode: "insensitive" } } } },
        ]
      : undefined,
    lastRelease: query.release ? { equals: query.release } : undefined,
    lastSeenAt:
      query.from || query.to
        ? {
            gte: readDate(query.from),
            lte: readDate(query.to),
          }
        : undefined,
  };
}

function appendDistinctPath(value: unknown, path: string | null | undefined) {
  const paths = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
  if (!path || paths.includes(path)) return paths.slice(0, 20);
  return [path, ...paths].slice(0, 20);
}

function readPriorityReasons(value: Prisma.InputJsonValue) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function resolvePriority(input: {
  score: number;
  reasons: Prisma.InputJsonValue;
  regression: boolean;
  releaseChanged: boolean;
}) {
  const reasons = readPriorityReasons(input.reasons);
  const nextReasons = [...reasons];
  let score = input.score;

  if (input.regression) {
    score += 20;
    if (!nextReasons.includes("regression")) nextReasons.push("regression");
  }
  if (input.releaseChanged) {
    score += 10;
    if (!nextReasons.includes("release_changed")) nextReasons.push("release_changed");
  }

  return {
    score: Math.min(100, score),
    reasons: nextReasons,
  };
}

export const observabilityErrorsRepository = {
  async recordOccurrence(entry: RecordOperationalErrorEntry) {
    return prisma.$transaction(async (tx) => {
      if (entry.session) {
        await tx.observabilitySession.upsert({
          where: { id: entry.session.id },
          create: {
            id: entry.session.id,
            visitorHash: entry.session.visitorHash,
            startedAt: entry.session.observedAt,
            lastSeenAt: entry.session.observedAt,
            landingPath: entry.session.landingPath ?? null,
            country: entry.session.country ?? null,
            userAgent: entry.session.userAgent ?? null,
            isLikelyBot: entry.session.isLikelyBot ?? false,
          },
          update: {
            lastSeenAt: entry.session.observedAt,
            exitPath: entry.session.landingPath ?? undefined,
            userAgent: entry.session.userAgent ?? undefined,
            isLikelyBot: entry.session.isLikelyBot ?? undefined,
          },
        });
      }

      const event = await tx.observabilityEvent.create({
        data: {
          sessionId: entry.event.sessionId ?? null,
          visitorHash: entry.event.visitorHash ?? null,
          type: entry.event.type,
          category: "ERROR",
          path: entry.event.path ?? null,
          pageType: entry.event.pageType ?? null,
          contentId: entry.event.contentId ?? null,
          contentType: entry.event.contentType ?? null,
          requestId: entry.event.requestId ?? null,
          correlationId: entry.event.correlationId ?? null,
          release: entry.event.release ?? null,
          sampleRate: entry.event.sampleRate,
          clientSequence: entry.event.clientSequence ?? null,
          clientElapsedMs: entry.event.clientElapsedMs ?? null,
          metadata: entry.event.metadata,
          receivedAtServer: entry.event.receivedAtServer,
        },
      });

      const existingGroup = await tx.errorGroup.findUnique({
        where: { fingerprint: entry.group.fingerprint },
        select: {
          id: true,
          affectedPaths: true,
          status: true,
          resolvedAt: true,
          regression: true,
          lastRelease: true,
          severity: true,
        },
      });
      const resolvedSignatureGroup = existingGroup
        ? null
        : await tx.errorGroup.findFirst({
            where: {
              errorSignature: entry.group.errorSignature,
              status: "RESOLVED",
              resolvedAt: { not: null },
            },
            orderBy: { resolvedAt: "desc" },
            select: { id: true },
          });
      const isRegression = Boolean(
        (existingGroup?.status === "RESOLVED" && existingGroup.resolvedAt) ||
        resolvedSignatureGroup,
      );
      const releaseChanged = Boolean(
        existingGroup?.lastRelease &&
        entry.group.release &&
        existingGroup.lastRelease !== entry.group.release,
      );
      const shouldReopenIgnored = Boolean(
        existingGroup?.status === "IGNORED" &&
        (entry.group.severity === "CRITICAL" || isRegression),
      );
      const priority = resolvePriority({
        score: entry.group.priorityScore,
        reasons: entry.group.priorityReasons,
        regression: isRegression,
        releaseChanged,
      });

      const group = existingGroup
        ? await tx.errorGroup.update({
            where: { id: existingGroup.id },
            data: {
              lastSeenAt: entry.occurrence.occurredAt,
              occurrenceCount: { increment: 1 },
              affectedPaths: appendDistinctPath(existingGroup.affectedPaths, entry.group.path),
              severity: entry.group.severity,
              impactArea: entry.group.impactArea,
              userImpact: entry.group.userImpact,
              regression: existingGroup.regression || isRegression,
              priorityScore: priority.score,
              priorityReasons: priority.reasons,
              status: isRegression || shouldReopenIgnored ? "OPEN" : undefined,
              reopenedAt:
                isRegression || shouldReopenIgnored ? entry.occurrence.occurredAt : undefined,
              reopenedBy: isRegression || shouldReopenIgnored ? null : undefined,
              lastStatusAt:
                isRegression || shouldReopenIgnored ? entry.occurrence.occurredAt : undefined,
              lastStatusBy: isRegression || shouldReopenIgnored ? null : undefined,
              lastRelease: entry.group.release ?? undefined,
            },
            select: { id: true },
          })
        : await tx.errorGroup.create({
            data: {
              fingerprint: entry.group.fingerprint,
              fingerprintVersion: entry.group.fingerprintVersion,
              errorSignature: entry.group.errorSignature,
              title: entry.group.title,
              source: entry.group.source,
              severity: entry.group.severity,
              firstSeenAt: entry.occurrence.occurredAt,
              lastSeenAt: entry.occurrence.occurredAt,
              occurrenceCount: 1,
              affectedSessions: entry.occurrence.sessionId ? 1 : 0,
              affectedPaths: appendDistinctPath([], entry.group.path),
              impactArea: entry.group.impactArea,
              userImpact: entry.group.userImpact,
              regression: isRegression,
              priorityScore: priority.score,
              priorityReasons: priority.reasons,
              firstRelease: entry.group.release ?? null,
              lastRelease: entry.group.release ?? null,
              reopenedAt: isRegression ? entry.occurrence.occurredAt : null,
              lastStatusAt: entry.occurrence.occurredAt,
            },
            select: { id: true },
          });

      const occurrence = await tx.errorOccurrence.create({
        data: {
          errorGroupId: group.id,
          observabilityEventId: event.id,
          sessionId: entry.occurrence.sessionId ?? null,
          requestId: entry.occurrence.requestId ?? null,
          correlationId: entry.occurrence.correlationId ?? null,
          path: entry.occurrence.path ?? null,
          routePath: entry.occurrence.routePath ?? null,
          routeType: entry.occurrence.routeType ?? null,
          method: entry.occurrence.method ?? null,
          statusCode: entry.occurrence.statusCode ?? null,
          actionContext: entry.occurrence.actionContext ?? null,
          userAgent: entry.occurrence.userAgent ?? null,
          deviceType: entry.occurrence.deviceType ?? null,
          browser: entry.occurrence.browser ?? null,
          os: entry.occurrence.os ?? null,
          stackTraceRedacted: entry.occurrence.stackTraceRedacted ?? null,
          metadata: entry.occurrence.metadata,
          occurredAt: entry.occurrence.occurredAt,
        },
        select: { id: true, errorGroupId: true },
      });

      if (entry.occurrence.sessionId) {
        const affectedSessions = await tx.errorOccurrence.findMany({
          where: { errorGroupId: group.id, sessionId: { not: null } },
          distinct: ["sessionId"],
          select: { sessionId: true },
        });

        await tx.errorGroup.update({
          where: { id: group.id },
          data: { affectedSessions: affectedSessions.length },
        });
      }

      return occurrence;
    });
  },

  async listGroups(query: ListObservabilityErrorsQuery, pagination: PaginationParams) {
    const orderBy =
      query.sortBy === "priorityScore"
        ? [{ priorityScore: query.sortOrder }, { lastSeenAt: "desc" as const }]
        : [{ [query.sortBy]: query.sortOrder }];

    return prisma.errorGroup.findMany({
      where: toErrorGroupWhereInput(query),
      orderBy,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: ERROR_GROUP_SELECT,
    });
  },

  async countGroups(query: ListObservabilityErrorsQuery) {
    return prisma.errorGroup.count({ where: toErrorGroupWhereInput(query) });
  },

  async getGroupById(id: string) {
    return prisma.errorGroup.findUnique({
      where: { id },
      select: {
        ...ERROR_GROUP_SELECT,
        occurrences: {
          orderBy: { occurredAt: "desc" },
          take: 25,
          select: ERROR_OCCURRENCE_SELECT,
        },
      },
    });
  },

  async getGroupStatusById(id: string) {
    return prisma.errorGroup.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
  },

  async updateStatus(id: string, status: ObservabilityErrorStatus, actorId?: string | null) {
    const now = new Date();
    const prismaStatus = toPrismaStatus(status);

    return prisma.errorGroup.update({
      where: { id },
      data: {
        status: prismaStatus,
        resolvedAt: status === "resolved" ? now : undefined,
        resolvedBy: status === "resolved" ? (actorId ?? null) : undefined,
        reopenedAt: status === "open" || status === "investigating" ? now : undefined,
        reopenedBy: status === "open" || status === "investigating" ? (actorId ?? null) : undefined,
        lastStatusAt: now,
        lastStatusBy: actorId ?? null,
      },
      select: ERROR_GROUP_SELECT,
    });
  },
};
