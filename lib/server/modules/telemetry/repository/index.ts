import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

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

export const telemetryRepository = {
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
