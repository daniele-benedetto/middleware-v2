import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { ObservabilityAggregateDomain } from "@/lib/server/modules/observability-aggregates/schema";

type DateWindow = { start: Date; end: Date };

const domainMap = {
  content: "CONTENT",
  errors: "ERRORS",
  performance: "PERFORMANCE",
  audit: "AUDIT",
  all: "ALL",
} as const;

function toPrismaDomain(domain: ObservabilityAggregateDomain) {
  return domainMap[domain];
}

export const observabilityAggregatesRepository = {
  async acquireJobRun(input: {
    jobName: string;
    domain: ObservabilityAggregateDomain;
    window: DateWindow;
    lockMs: number;
    metadata?: Prisma.InputJsonValue;
  }) {
    const now = new Date();
    const locked = await prisma.observabilityJobRun.findFirst({
      where: {
        jobName: input.jobName,
        domain: toPrismaDomain(input.domain),
        windowStart: input.window.start,
        windowEnd: input.window.end,
        status: "RUNNING",
        lockedUntil: { gt: now },
      },
      select: { id: true },
    });

    if (locked) return null;

    return prisma.observabilityJobRun.create({
      data: {
        jobName: input.jobName,
        domain: toPrismaDomain(input.domain),
        windowStart: input.window.start,
        windowEnd: input.window.end,
        lockedUntil: new Date(now.getTime() + input.lockMs),
        metadata: input.metadata ?? undefined,
      },
      select: { id: true },
    });
  },

  async finishJobRun(
    id: string,
    input: { processedRows: number; metadata?: Prisma.InputJsonValue },
  ) {
    return prisma.observabilityJobRun.update({
      where: { id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        lockedUntil: null,
        processedRows: input.processedRows,
        metadata: input.metadata ?? undefined,
      },
    });
  },

  async failJobRun(id: string, error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown observability job failure";
    return prisma.observabilityJobRun.update({
      where: { id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        lockedUntil: null,
        errorMessage: message.slice(0, 1000),
      },
    });
  },

  async listContentSource(window: DateWindow) {
    return prisma.contentEngagement.findMany({
      where: {
        firstSeenAt: { gte: window.start, lt: window.end },
        session: { is: { isLikelyBot: false } },
      },
      select: {
        sessionId: true,
        contentType: true,
        contentId: true,
        path: true,
        pageType: true,
        firstSeenAt: true,
        activeTimeMs: true,
        completed: true,
        engagementLevel: true,
        returnCountInSession: true,
        sampleRate: true,
      },
    });
  },

  async listAudioSource(window: DateWindow) {
    return prisma.audioEngagement.findMany({
      where: {
        firstSeenAt: { gte: window.start, lt: window.end },
        session: { is: { isLikelyBot: false } },
      },
      select: {
        sessionId: true,
        articleId: true,
        path: true,
        firstSeenAt: true,
        completed: true,
      },
    });
  },

  async listPerformanceSource(window: DateWindow) {
    return prisma.performanceExperience.findMany({
      where: {
        occurredAt: { gte: window.start, lt: window.end },
        session: { is: { isLikelyBot: false } },
      },
      select: {
        sessionId: true,
        path: true,
        pageType: true,
        contentId: true,
        deviceType: true,
        release: true,
        lcp: true,
        inp: true,
        cls: true,
        fcp: true,
        ttfb: true,
        rating: true,
        perceivedQuality: true,
        causedEarlyExit: true,
        sampleRate: true,
        thresholdVersion: true,
        occurredAt: true,
      },
    });
  },

  async listErrorSource(window: DateWindow) {
    return prisma.errorOccurrence.findMany({
      where: { occurredAt: { gte: window.start, lt: window.end } },
      select: {
        sessionId: true,
        path: true,
        occurredAt: true,
        errorGroup: {
          select: {
            id: true,
            source: true,
            severity: true,
            status: true,
            impactArea: true,
            userImpact: true,
            regression: true,
            priorityScore: true,
            firstSeenAt: true,
            lastRelease: true,
          },
        },
      },
    });
  },

  async listAuditSource(window: DateWindow) {
    return prisma.auditActivity.findMany({
      where: { createdAt: { gte: window.start, lt: window.end } },
      select: {
        actorId: true,
        action: true,
        resourceType: true,
        outcome: true,
        riskLevel: true,
        publicImpact: true,
        createdAt: true,
      },
    });
  },

  async replaceContentAggregates(
    window: DateWindow,
    rows: Prisma.DailyContentQualityAggregateCreateManyInput[],
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.dailyContentQualityAggregate.deleteMany({
        where: { date: { gte: window.start, lt: window.end } },
      });
      if (rows.length) await tx.dailyContentQualityAggregate.createMany({ data: rows });
      return rows.length;
    });
  },

  async replacePerformanceAggregates(
    window: DateWindow,
    rows: Prisma.DailyPerformanceAggregateCreateManyInput[],
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.dailyPerformanceAggregate.deleteMany({
        where: { date: { gte: window.start, lt: window.end } },
      });
      if (rows.length) await tx.dailyPerformanceAggregate.createMany({ data: rows });
      return rows.length;
    });
  },

  async replaceErrorAggregates(
    window: DateWindow,
    rows: Prisma.DailyErrorAggregateCreateManyInput[],
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.dailyErrorAggregate.deleteMany({
        where: { date: { gte: window.start, lt: window.end } },
      });
      if (rows.length) await tx.dailyErrorAggregate.createMany({ data: rows });
      return rows.length;
    });
  },

  async replaceAuditAggregates(
    window: DateWindow,
    rows: Prisma.DailyAuditAggregateCreateManyInput[],
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.dailyAuditAggregate.deleteMany({
        where: { date: { gte: window.start, lt: window.end } },
      });
      if (rows.length) await tx.dailyAuditAggregate.createMany({ data: rows });
      return rows.length;
    });
  },

  async prune(before: {
    raw?: Date;
    interpreted?: Date;
    errorOccurrences?: Date;
    aggregates?: Date;
  }) {
    const [
      events,
      content,
      audio,
      performance,
      occurrences,
      contentAgg,
      performanceAgg,
      errorAgg,
      auditAgg,
    ] = await prisma.$transaction([
      before.raw
        ? prisma.observabilityEvent.deleteMany({ where: { receivedAtServer: { lt: before.raw } } })
        : prisma.observabilityEvent.deleteMany({ where: { id: "__never__" } }),
      before.interpreted
        ? prisma.contentEngagement.deleteMany({ where: { lastSeenAt: { lt: before.interpreted } } })
        : prisma.contentEngagement.deleteMany({ where: { id: "__never__" } }),
      before.interpreted
        ? prisma.audioEngagement.deleteMany({ where: { lastSeenAt: { lt: before.interpreted } } })
        : prisma.audioEngagement.deleteMany({ where: { id: "__never__" } }),
      before.interpreted
        ? prisma.performanceExperience.deleteMany({
            where: { occurredAt: { lt: before.interpreted } },
          })
        : prisma.performanceExperience.deleteMany({ where: { id: "__never__" } }),
      before.errorOccurrences
        ? prisma.errorOccurrence.deleteMany({
            where: { occurredAt: { lt: before.errorOccurrences } },
          })
        : prisma.errorOccurrence.deleteMany({ where: { id: "__never__" } }),
      before.aggregates
        ? prisma.dailyContentQualityAggregate.deleteMany({
            where: { date: { lt: before.aggregates } },
          })
        : prisma.dailyContentQualityAggregate.deleteMany({ where: { id: "__never__" } }),
      before.aggregates
        ? prisma.dailyPerformanceAggregate.deleteMany({
            where: { date: { lt: before.aggregates } },
          })
        : prisma.dailyPerformanceAggregate.deleteMany({ where: { id: "__never__" } }),
      before.aggregates
        ? prisma.dailyErrorAggregate.deleteMany({ where: { date: { lt: before.aggregates } } })
        : prisma.dailyErrorAggregate.deleteMany({ where: { id: "__never__" } }),
      before.aggregates
        ? prisma.dailyAuditAggregate.deleteMany({ where: { date: { lt: before.aggregates } } })
        : prisma.dailyAuditAggregate.deleteMany({ where: { id: "__never__" } }),
    ]);

    return {
      events: events.count,
      contentEngagements: content.count,
      audioEngagements: audio.count,
      performanceExperiences: performance.count,
      errorOccurrences: occurrences.count,
      contentAggregates: contentAgg.count,
      performanceAggregates: performanceAgg.count,
      errorAggregates: errorAgg.count,
      auditAggregates: auditAgg.count,
    };
  },

  async listContentAggregates(input: {
    from: Date;
    pageType?: string;
    contentType?: string;
    contentId?: string;
    path?: string;
  }) {
    return prisma.dailyContentQualityAggregate.findMany({
      where: {
        date: { gte: input.from },
        pageType: input.pageType,
        contentType: input.contentType,
        contentId: input.contentId,
        path: input.path,
      },
      orderBy: [{ date: "desc" }, { qualityScore: "desc" }],
      take: 100,
    });
  },

  async countContentAggregates(input: {
    from: Date;
    pageType?: string;
    contentType?: string;
    contentId?: string;
    path?: string;
  }) {
    return prisma.dailyContentQualityAggregate.count({
      where: {
        date: { gte: input.from },
        pageType: input.pageType,
        contentType: input.contentType,
        contentId: input.contentId,
        path: input.path,
      },
    });
  },

  async listPerformanceAggregates(input: {
    from: Date;
    pageType?: string;
    deviceType?: string;
    release?: string;
    path?: string;
  }) {
    return prisma.dailyPerformanceAggregate.findMany({
      where: {
        date: { gte: input.from },
        pageType: input.pageType,
        deviceType: input.deviceType,
        release: input.release,
        path: input.path,
      },
      orderBy: [{ date: "desc" }, { poorRate: "desc" }],
      take: 100,
    });
  },

  async countPerformanceAggregates(input: {
    from: Date;
    pageType?: string;
    deviceType?: string;
    release?: string;
    path?: string;
  }) {
    return prisma.dailyPerformanceAggregate.count({
      where: {
        date: { gte: input.from },
        pageType: input.pageType,
        deviceType: input.deviceType,
        release: input.release,
        path: input.path,
      },
    });
  },

  async listErrorAggregates(input: {
    from: Date;
    severity?: string;
    status?: string;
    release?: string;
  }) {
    return prisma.dailyErrorAggregate.findMany({
      where: {
        date: { gte: input.from },
        severity: input.severity,
        status: input.status,
        release: input.release,
      },
      orderBy: [{ date: "desc" }, { criticalHighGroups: "desc" }, { regressions: "desc" }],
      take: 100,
    });
  },

  async listAuditAggregates(input: { from: Date; riskLevel?: string; outcome?: string }) {
    return prisma.dailyAuditAggregate.findMany({
      where: {
        date: { gte: input.from },
        riskLevel: input.riskLevel,
        outcome: input.outcome,
      },
      orderBy: [{ date: "desc" }, { highCriticalCount: "desc" }, { failureCount: "desc" }],
      take: 100,
    });
  },
};
