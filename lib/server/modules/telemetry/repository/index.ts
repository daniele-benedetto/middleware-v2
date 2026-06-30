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
  ListTelemetryErrorsQuery,
  ObservabilityErrorStatus,
} from "@/lib/server/modules/telemetry/schema";

const ERROR_GROUP_LIST_SELECT = {
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
  firstRelease: true,
  lastRelease: true,
  resolvedAt: true,
  resolvedBy: true,
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
  stackTraceRedacted: true,
  metadata: true,
  occurredAt: true,
} as const satisfies Prisma.ErrorOccurrenceSelect;

export type RecordErrorEntry = {
  session?: {
    id: string;
    visitorHash: string;
    landingPath?: string | null;
    referrerDomain?: string | null;
    country?: string | null;
    userAgent?: string | null;
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

function toPrismaSource(
  value: ListTelemetryErrorsQuery["source"],
): PrismaObservabilityErrorSource | undefined {
  return value ? (value.toUpperCase() as PrismaObservabilityErrorSource) : undefined;
}

function toPrismaSeverity(
  value: ListTelemetryErrorsQuery["severity"],
): PrismaObservabilityErrorSeverity | undefined {
  return value ? (value.toUpperCase() as PrismaObservabilityErrorSeverity) : undefined;
}

function toPrismaStatus(value: ObservabilityErrorStatus): PrismaObservabilityErrorStatus {
  return value.toUpperCase() as PrismaObservabilityErrorStatus;
}

function toErrorGroupWhereInput(query: ListTelemetryErrorsQuery): Prisma.ErrorGroupWhereInput {
  return {
    source: toPrismaSource(query.source),
    severity: toPrismaSeverity(query.severity),
    status: query.status ? toPrismaStatus(query.status) : undefined,
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
  };
}

function appendDistinctPath(value: unknown, path: string | null | undefined) {
  const paths = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

  if (!path || paths.includes(path)) {
    return paths.slice(0, 20);
  }

  return [path, ...paths].slice(0, 20);
}

export const telemetryRepository = {
  async recordError(entry: RecordErrorEntry) {
    return prisma.$transaction(async (tx) => {
      if (entry.session) {
        await tx.observabilitySession.upsert({
          where: { id: entry.session.id },
          create: {
            id: entry.session.id,
            visitorHash: entry.session.visitorHash,
            startedAt: entry.event.receivedAtServer,
            lastSeenAt: entry.event.receivedAtServer,
            landingPath: entry.session.landingPath ?? null,
            referrerDomain: entry.session.referrerDomain ?? null,
            country: entry.session.country ?? null,
            userAgent: entry.session.userAgent ?? null,
          },
          update: {
            lastSeenAt: entry.event.receivedAtServer,
            exitPath: entry.session.landingPath ?? undefined,
            userAgent: entry.session.userAgent ?? undefined,
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
        select: { id: true, affectedPaths: true },
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
              firstRelease: entry.group.release ?? null,
              lastRelease: entry.group.release ?? null,
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

  async listErrorGroups(query: ListTelemetryErrorsQuery, pagination: PaginationParams) {
    return prisma.errorGroup.findMany({
      where: toErrorGroupWhereInput(query),
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: ERROR_GROUP_LIST_SELECT,
    });
  },

  async countErrorGroups(query: ListTelemetryErrorsQuery) {
    return prisma.errorGroup.count({ where: toErrorGroupWhereInput(query) });
  },

  async getErrorGroupById(id: string) {
    return prisma.errorGroup.findUnique({
      where: { id },
      select: {
        ...ERROR_GROUP_LIST_SELECT,
        occurrences: {
          orderBy: { occurredAt: "desc" },
          take: 25,
          select: ERROR_OCCURRENCE_SELECT,
        },
      },
    });
  },

  async updateErrorGroupStatus(
    id: string,
    status: ObservabilityErrorStatus,
    actorId?: string | null,
  ) {
    const resolvedAt = status === "resolved" ? new Date() : null;

    return prisma.errorGroup.update({
      where: { id },
      data: {
        status: toPrismaStatus(status),
        resolvedAt,
        resolvedBy: status === "resolved" ? (actorId ?? null) : null,
      },
      select: ERROR_GROUP_LIST_SELECT,
    });
  },
};
