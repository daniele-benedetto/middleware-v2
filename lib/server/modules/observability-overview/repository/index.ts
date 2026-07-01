import "server-only";

import { prisma } from "@/lib/prisma";

import type { ObservabilityOverviewQuery } from "@/lib/server/modules/observability-overview/schema";

type DateWindow = { from: Date; to: Date };

function windowWhere(window: DateWindow) {
  return { gte: window.from, lt: window.to };
}

function compact<T>(items: Array<T | null | undefined>) {
  return items.filter((item): item is T => item !== null && item !== undefined);
}

export const observabilityOverviewRepository = {
  async listContentAggregates(window: DateWindow, query: ObservabilityOverviewQuery) {
    return prisma.dailyContentQualityAggregate.findMany({
      where: {
        date: windowWhere(window),
        pageType: query.pageType,
        contentType: query.contentType,
        contentId: query.contentId,
        path: query.path,
      },
      orderBy: [{ date: "desc" }, { qualityScore: "desc" }],
      take: 500,
    });
  },

  async listPerformanceAggregates(window: DateWindow, query: ObservabilityOverviewQuery) {
    return prisma.dailyPerformanceAggregate.findMany({
      where: {
        date: windowWhere(window),
        pageType: query.pageType,
        path: query.path,
        contentId: query.contentId,
        release: query.release,
      },
      orderBy: [{ date: "desc" }, { poorRate: "desc" }],
      take: 500,
    });
  },

  async listErrorAggregates(window: DateWindow, query: ObservabilityOverviewQuery) {
    return prisma.dailyErrorAggregate.findMany({
      where: {
        date: windowWhere(window),
        severity: query.severity?.toUpperCase(),
        release: query.release,
      },
      orderBy: [{ date: "desc" }, { regressions: "desc" }, { criticalHighGroups: "desc" }],
      take: 500,
    });
  },

  async listAuditAggregates(window: DateWindow, query: ObservabilityOverviewQuery) {
    return prisma.dailyAuditAggregate.findMany({
      where: {
        date: windowWhere(window),
        riskLevel: query.riskLevel?.toUpperCase(),
      },
      orderBy: [{ date: "desc" }, { highCriticalCount: "desc" }, { failureCount: "desc" }],
      take: 500,
    });
  },

  async listCriticalErrorGroups(window: DateWindow, query: ObservabilityOverviewQuery) {
    return prisma.errorGroup.findMany({
      where: {
        lastSeenAt: windowWhere(window),
        lastRelease: query.release,
        status: { not: "IGNORED" },
        OR: [{ regression: true }, { severity: { in: ["HIGH", "CRITICAL"] } }],
      },
      orderBy: [{ priorityScore: "desc" }, { lastSeenAt: "desc" }],
      take: 25,
    });
  },

  async listBlockingErrorExitCandidates(window: DateWindow) {
    const occurrences = await prisma.errorOccurrence.findMany({
      where: {
        occurredAt: windowWhere(window),
        sessionId: { not: null },
        errorGroup: {
          status: { not: "IGNORED" },
          OR: [
            { severity: { in: ["HIGH", "CRITICAL"] } },
            { userImpact: { in: ["BLOCKED_ACTION", "LOST_CONTENT"] } },
            { regression: true },
          ],
        },
      },
      select: {
        id: true,
        sessionId: true,
        path: true,
        requestId: true,
        correlationId: true,
        occurredAt: true,
        errorGroup: {
          select: {
            id: true,
            title: true,
            severity: true,
            userImpact: true,
            priorityScore: true,
            regression: true,
          },
        },
      },
      orderBy: { occurredAt: "desc" },
      take: 50,
    });

    return Promise.all(
      occurrences.map(async (occurrence) => {
        const relatedExitCount = await prisma.performanceExperience.count({
          where: {
            occurredAt: {
              gte: new Date(occurrence.occurredAt.getTime() - 5 * 60 * 1000),
              lt: new Date(occurrence.occurredAt.getTime() + 15 * 60 * 1000),
            },
            sessionId: occurrence.sessionId,
            path: occurrence.path ?? undefined,
            OR: [
              { causedEarlyExit: true },
              { perceivedQuality: "broken" },
              { hasBlockingError: true },
            ],
          },
        });
        return { ...occurrence, relatedExitCount };
      }),
    );
  },

  async listAuditErrorCandidates(window: DateWindow) {
    const activities = await prisma.auditActivity.findMany({
      where: {
        createdAt: windowWhere(window),
        OR: [
          { riskLevel: { in: ["HIGH", "CRITICAL"] } },
          { outcome: "FAILURE" },
          { publicImpact: true },
        ],
      },
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        outcome: true,
        riskLevel: true,
        publicImpact: true,
        requestId: true,
        correlationId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return Promise.all(
      activities.map(async (activity) => {
        const keys = compact([
          activity.requestId ? { requestId: activity.requestId } : null,
          activity.correlationId ? { correlationId: activity.correlationId } : null,
        ]);
        const relatedErrorCount = keys.length
          ? await prisma.errorOccurrence.count({
              where: {
                occurredAt: {
                  gte: activity.createdAt,
                  lt: new Date(activity.createdAt.getTime() + 30 * 60 * 1000),
                },
                OR: keys,
                errorGroup: { status: { not: "IGNORED" } },
              },
            })
          : 0;
        return { ...activity, relatedErrorCount };
      }),
    );
  },

  async listReferrerQualityCandidates(window: DateWindow) {
    return prisma.contentEngagement.findMany({
      where: {
        firstSeenAt: windowWhere(window),
        session: { is: { isLikelyBot: false, referrerDomain: { not: null } } },
      },
      select: {
        path: true,
        pageType: true,
        contentId: true,
        engagementLevel: true,
        completed: true,
        activeTimeMs: true,
        session: { select: { referrerDomain: true } },
      },
      take: 500,
    });
  },
};
