import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type { ListTelemetryErrorsQuery } from "@/lib/server/modules/telemetry/schema";

const ERROR_LOG_LIST_SELECT = {
  id: true,
  fingerprint: true,
  source: true,
  name: true,
  message: true,
  digest: true,
  path: true,
  method: true,
  routePath: true,
  routeType: true,
  requestId: true,
  userAgent: true,
  count: true,
  firstSeenAt: true,
  lastSeenAt: true,
  metadata: true,
} as const satisfies Prisma.ErrorLogSelect;

type CreateAnalyticsEventEntry = {
  event: string;
  path: string;
  referrer?: string | null;
  country?: string | null;
  visitorHash: string;
  metadata?: Prisma.InputJsonValue;
};

type CreateWebVitalEntry = {
  metricId: string;
  name: string;
  value: number;
  delta: number;
  rating?: string | null;
  navigationType?: string | null;
  path: string;
  visitorHash?: string | null;
};

type UpsertErrorLogEntry = {
  fingerprint: string;
  source: string;
  name?: string | null;
  message: string;
  digest?: string | null;
  path?: string | null;
  method?: string | null;
  routePath?: string | null;
  routeType?: string | null;
  requestId?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
};

function getDateThreshold(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function toErrorLogWhereInput(query: ListTelemetryErrorsQuery): Prisma.ErrorLogWhereInput {
  return {
    source: query.source,
    OR: query.q
      ? [
          { name: { contains: query.q, mode: "insensitive" } },
          { message: { contains: query.q, mode: "insensitive" } },
          { path: { contains: query.q, mode: "insensitive" } },
          { routePath: { contains: query.q, mode: "insensitive" } },
          { requestId: { contains: query.q, mode: "insensitive" } },
          { digest: { contains: query.q, mode: "insensitive" } },
        ]
      : undefined,
  };
}

export const telemetryRepository = {
  async listAnalyticsAggregates(days: number) {
    return prisma.telemetryDailyAggregate.findMany({
      where: {
        date: { gte: getDateThreshold(days) },
      },
      orderBy: [{ date: "asc" }, { views: "desc" }],
      select: {
        date: true,
        event: true,
        path: true,
        referrer: true,
        country: true,
        views: true,
        visitors: true,
      },
    });
  },

  async countDistinctAnalyticsVisitors(days: number) {
    const result = await prisma.analyticsEvent.groupBy({
      by: ["visitorHash"],
      where: {
        createdAt: { gte: getDateThreshold(days) },
      },
      _count: {
        visitorHash: true,
      },
    });

    return result.length;
  },

  async listWebVitalAggregates(days: number) {
    return prisma.webVitalDailyAggregate.findMany({
      where: {
        date: { gte: getDateThreshold(days) },
      },
      orderBy: [{ date: "desc" }, { name: "asc" }, { p75: "desc" }],
      select: {
        date: true,
        path: true,
        name: true,
        count: true,
        p50: true,
        p75: true,
        p95: true,
        good: true,
        needsImprovement: true,
        poor: true,
      },
    });
  },

  async listErrorLogs(query: ListTelemetryErrorsQuery, pagination: PaginationParams) {
    const where = toErrorLogWhereInput(query);

    return prisma.errorLog.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      select: ERROR_LOG_LIST_SELECT,
    });
  },

  async countErrorLogs(query: ListTelemetryErrorsQuery) {
    return prisma.errorLog.count({ where: toErrorLogWhereInput(query) });
  },

  async getErrorLogById(id: string) {
    return prisma.errorLog.findUnique({
      where: { id },
      select: ERROR_LOG_LIST_SELECT,
    });
  },

  async createAnalyticsEvent(entry: CreateAnalyticsEventEntry) {
    return prisma.analyticsEvent.create({
      data: {
        event: entry.event,
        path: entry.path,
        referrer: entry.referrer ?? null,
        country: entry.country ?? null,
        visitorHash: entry.visitorHash,
        metadata: entry.metadata,
      },
    });
  },

  async createWebVital(entry: CreateWebVitalEntry) {
    await prisma.webVital.createMany({
      data: [
        {
          metricId: entry.metricId,
          name: entry.name,
          value: entry.value,
          delta: entry.delta,
          rating: entry.rating ?? null,
          navigationType: entry.navigationType ?? null,
          path: entry.path,
          visitorHash: entry.visitorHash ?? null,
        },
      ],
      skipDuplicates: true,
    });
  },

  async upsertErrorLog(entry: UpsertErrorLogEntry) {
    const now = new Date();

    return prisma.errorLog.upsert({
      where: { fingerprint: entry.fingerprint },
      create: {
        fingerprint: entry.fingerprint,
        source: entry.source,
        name: entry.name ?? null,
        message: entry.message,
        digest: entry.digest ?? null,
        path: entry.path ?? null,
        method: entry.method ?? null,
        routePath: entry.routePath ?? null,
        routeType: entry.routeType ?? null,
        requestId: entry.requestId ?? null,
        userAgent: entry.userAgent ?? null,
        firstSeenAt: now,
        lastSeenAt: now,
        metadata: entry.metadata,
      },
      update: {
        count: { increment: 1 },
        lastSeenAt: now,
        requestId: entry.requestId ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: entry.metadata,
      },
    });
  },
};
