import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type { ObservabilityEventCategory as PrismaObservabilityEventCategory } from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  ListContentEngagementQuery,
  TelemetryEngagementQuery,
} from "@/lib/server/modules/telemetry/schema";

const CONTENT_ENGAGEMENT_SELECT = {
  id: true,
  firstSeenAt: true,
  contentId: true,
  slug: true,
  path: true,
  pageType: true,
  contentType: true,
  activeTimeMs: true,
  maxScrollDepth: true,
  scrollMilestones: true,
  interactionCount: true,
  completed: true,
  engagementLevel: true,
  exitType: true,
  returnCountInSession: true,
  refreshCount: true,
  lastSeenAt: true,
} as const satisfies Prisma.ContentEngagementSelect;

export type UpsertObservabilitySessionEntry = {
  id: string;
  visitorHash: string;
  observedAt: Date;
  landingPath?: string | null;
  exitPath?: string | null;
  referrerDomain?: string | null;
  country?: string | null;
  userAgent?: string | null;
  isLikelyBot?: boolean;
  endedAt?: Date | null;
};

export type CreateObservabilityEventEntry = {
  sessionId?: string | null;
  visitorHash?: string | null;
  type: string;
  category: PrismaObservabilityEventCategory;
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

export type UpsertContentEngagementEntry = {
  sessionId?: string | null;
  visitorHash?: string | null;
  contentType?: string | null;
  contentId?: string | null;
  slug?: string | null;
  path: string;
  pageType: string;
  observedAt: Date;
  activeTimeDeltaMs?: number;
  maxScrollDepth?: number;
  scrollMilestones?: number[];
  interactionDelta?: number;
  returnDelta?: number;
  refreshDelta?: number;
  completed?: boolean;
  engagementLevel: string;
  exitType?: string;
  eventType?: string;
  sampleRate: number;
};

export type UpsertAudioEngagementEntry = {
  sessionId?: string | null;
  visitorHash?: string | null;
  articleId?: string | null;
  path: string;
  observedAt: Date;
  started?: boolean;
  completed?: boolean;
  listenedMs?: number;
  completionRate?: number;
  seekDelta?: number;
  replayDelta?: number;
};

function getPeriodStart(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function toContentEngagementWhereInput(
  query: TelemetryEngagementQuery | ListContentEngagementQuery,
): Prisma.ContentEngagementWhereInput {
  return {
    firstSeenAt: { gte: getPeriodStart(query.days) },
    pageType: query.pageType,
    contentType: query.contentType,
    session: { is: { isLikelyBot: false } },
    OR:
      "q" in query && query.q
        ? [
            { slug: { contains: query.q, mode: "insensitive" } },
            { path: { contains: query.q, mode: "insensitive" } },
            { contentId: { contains: query.q, mode: "insensitive" } },
          ]
        : undefined,
  };
}

function readNumberArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    : [];
}

function mergeScrollMilestones(existingValue: unknown, nextValue: number[]) {
  return Array.from(new Set([...readNumberArray(existingValue), ...nextValue])).sort(
    (first, second) => first - second,
  );
}

function engagementRank(value: string) {
  switch (value) {
    case "completed":
      return 4;
    case "engaged":
      return 3;
    case "scan":
      return 2;
    default:
      return 1;
  }
}

function maxEngagementLevel(first: string, second: string) {
  return engagementRank(second) > engagementRank(first) ? second : first;
}

function deriveStoredEngagementLevel(input: {
  pageType: string;
  activeTimeMs: number;
  maxScrollDepth: number;
  interactionCount: number;
  completed: boolean;
}) {
  if (input.completed) return "completed";

  if (input.pageType === "listen") {
    if (input.activeTimeMs >= 30_000) return "engaged";
    return input.interactionCount > 0 ? "scan" : "glance";
  }

  if (input.pageType === "home" || input.pageType === "issue") {
    if (input.maxScrollDepth >= 90 && input.interactionCount > 0) return "completed";
    if (input.maxScrollDepth >= 50 || input.interactionCount >= 2 || input.activeTimeMs >= 30_000) {
      return "engaged";
    }
    return input.maxScrollDepth >= 25 || input.interactionCount > 0 ? "scan" : "glance";
  }

  if (input.pageType === "media") {
    if (input.activeTimeMs >= 15_000 || input.interactionCount > 0) return "engaged";
    return input.activeTimeMs >= 5_000 ? "scan" : "glance";
  }

  if (input.maxScrollDepth >= 85 && input.activeTimeMs >= 45_000) return "completed";
  if (input.maxScrollDepth >= 50 && input.activeTimeMs >= 30_000) return "engaged";
  return input.maxScrollDepth >= 25 || input.activeTimeMs >= 5_000 || input.interactionCount > 0
    ? "scan"
    : "glance";
}

function deriveReturnCounters(input: {
  existingLastSeenAt: Date;
  observedAt: Date;
  eventType?: string;
}) {
  if (input.eventType !== "page_enter") {
    return { refreshDelta: 0, returnDelta: 0 };
  }

  const gapMs = input.observedAt.getTime() - input.existingLastSeenAt.getTime();

  if (gapMs <= 0) {
    return { refreshDelta: 0, returnDelta: 0 };
  }

  return gapMs <= 10_000
    ? { refreshDelta: 1, returnDelta: 0 }
    : { refreshDelta: 0, returnDelta: 1 };
}

function deriveExitType(input: {
  eventType?: string;
  existingExitType?: string;
  activeTimeMs: number;
  maxScrollDepth: number;
  interactionCount: number;
  nextExitType?: string;
}) {
  if (input.nextExitType) {
    return input.nextExitType;
  }

  if (input.eventType === "navigation_click") {
    return "internal_navigation";
  }

  if (input.eventType === "page_exit") {
    if (input.activeTimeMs < 5_000 && input.maxScrollDepth < 25 && input.interactionCount === 0) {
      return "bounce";
    }

    return input.existingExitType && input.existingExitType !== "unknown"
      ? input.existingExitType
      : "unknown";
  }

  return input.existingExitType ?? "unknown";
}

export const telemetryRepository = {
  async recordSessionEvent(entry: {
    session: UpsertObservabilitySessionEntry;
    event: CreateObservabilityEventEntry;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.observabilitySession.upsert({
        where: { id: entry.session.id },
        create: {
          id: entry.session.id,
          visitorHash: entry.session.visitorHash,
          startedAt: entry.session.observedAt,
          lastSeenAt: entry.session.observedAt,
          endedAt: entry.session.endedAt ?? null,
          landingPath: entry.session.landingPath ?? null,
          exitPath: entry.session.exitPath ?? null,
          referrerDomain: entry.session.referrerDomain ?? null,
          country: entry.session.country ?? null,
          userAgent: entry.session.userAgent ?? null,
          isLikelyBot: entry.session.isLikelyBot ?? false,
        },
        update: {
          lastSeenAt: entry.session.observedAt,
          endedAt: entry.session.endedAt ?? undefined,
          exitPath: entry.session.exitPath ?? undefined,
          referrerDomain: entry.session.referrerDomain ?? undefined,
          country: entry.session.country ?? undefined,
          userAgent: entry.session.userAgent ?? undefined,
          isLikelyBot: entry.session.isLikelyBot ? true : undefined,
        },
      });

      return tx.observabilityEvent.create({
        data: {
          sessionId: entry.event.sessionId ?? null,
          visitorHash: entry.event.visitorHash ?? null,
          type: entry.event.type,
          category: entry.event.category,
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
    });
  },

  async upsertContentEngagement(entry: UpsertContentEngagementEntry) {
    const existing = await prisma.contentEngagement.findFirst({
      where: {
        sessionId: entry.sessionId ?? null,
        path: entry.path,
        contentId: entry.contentId ?? null,
      },
      select: {
        id: true,
        activeTimeMs: true,
        maxScrollDepth: true,
        scrollMilestones: true,
        interactionCount: true,
        returnCountInSession: true,
        refreshCount: true,
        completed: true,
        engagementLevel: true,
        exitType: true,
        lastSeenAt: true,
      },
    });

    if (!existing) {
      return prisma.contentEngagement.create({
        data: {
          sessionId: entry.sessionId ?? null,
          visitorHash: entry.visitorHash ?? null,
          contentType: entry.contentType ?? null,
          contentId: entry.contentId ?? null,
          slug: entry.slug ?? null,
          path: entry.path,
          pageType: entry.pageType,
          firstSeenAt: entry.observedAt,
          lastSeenAt: entry.observedAt,
          activeTimeMs: entry.activeTimeDeltaMs ?? 0,
          maxScrollDepth: entry.maxScrollDepth ?? 0,
          scrollMilestones: entry.scrollMilestones ?? [],
          interactionCount: entry.interactionDelta ?? 0,
          returnCountInSession: entry.returnDelta ?? 0,
          refreshCount: entry.refreshDelta ?? 0,
          completed: entry.completed ?? false,
          engagementLevel: entry.engagementLevel,
          exitType: entry.exitType ?? "unknown",
          sampleRate: entry.sampleRate,
        },
      });
    }

    const activeTimeMs = existing.activeTimeMs + (entry.activeTimeDeltaMs ?? 0);
    const maxScrollDepth = Math.max(existing.maxScrollDepth, entry.maxScrollDepth ?? 0);
    const interactionCount = existing.interactionCount + (entry.interactionDelta ?? 0);
    const completed = existing.completed || (entry.completed ?? false);
    const engagementLevel = deriveStoredEngagementLevel({
      pageType: entry.pageType,
      activeTimeMs,
      maxScrollDepth,
      interactionCount,
      completed,
    });
    const counters = deriveReturnCounters({
      existingLastSeenAt: existing.lastSeenAt,
      observedAt: entry.observedAt,
      eventType: entry.eventType,
    });
    const exitType = deriveExitType({
      eventType: entry.eventType,
      existingExitType: existing.exitType,
      activeTimeMs,
      maxScrollDepth,
      interactionCount,
      nextExitType: entry.exitType,
    });

    return prisma.contentEngagement.update({
      where: { id: existing.id },
      data: {
        visitorHash: entry.visitorHash ?? undefined,
        contentType: entry.contentType ?? undefined,
        contentId: entry.contentId ?? undefined,
        slug: entry.slug ?? undefined,
        pageType: entry.pageType,
        lastSeenAt: entry.observedAt,
        activeTimeMs,
        maxScrollDepth,
        scrollMilestones: mergeScrollMilestones(
          existing.scrollMilestones,
          entry.scrollMilestones ?? [],
        ),
        interactionCount,
        returnCountInSession:
          existing.returnCountInSession + (entry.returnDelta ?? 0) + counters.returnDelta,
        refreshCount: existing.refreshCount + (entry.refreshDelta ?? 0) + counters.refreshDelta,
        completed,
        engagementLevel: maxEngagementLevel(existing.engagementLevel, engagementLevel),
        exitType,
        sampleRate: entry.sampleRate,
      },
    });
  },

  async upsertAudioEngagement(entry: UpsertAudioEngagementEntry) {
    const existing = await prisma.audioEngagement.findFirst({
      where: {
        sessionId: entry.sessionId ?? null,
        articleId: entry.articleId ?? null,
        path: entry.path,
      },
      select: {
        id: true,
        started: true,
        completed: true,
        listenedMs: true,
        completionRate: true,
        seekCount: true,
        replayCount: true,
      },
    });

    if (!existing) {
      return prisma.audioEngagement.create({
        data: {
          sessionId: entry.sessionId ?? null,
          visitorHash: entry.visitorHash ?? null,
          articleId: entry.articleId ?? null,
          path: entry.path,
          started: entry.started ?? false,
          completed: entry.completed ?? false,
          listenedMs: entry.listenedMs ?? 0,
          completionRate: entry.completionRate ?? 0,
          seekCount: entry.seekDelta ?? 0,
          replayCount: entry.replayDelta ?? 0,
          firstSeenAt: entry.observedAt,
          lastSeenAt: entry.observedAt,
        },
      });
    }

    return prisma.audioEngagement.update({
      where: { id: existing.id },
      data: {
        visitorHash: entry.visitorHash ?? undefined,
        started: existing.started || (entry.started ?? false),
        completed: existing.completed || (entry.completed ?? false),
        listenedMs: Math.max(existing.listenedMs, entry.listenedMs ?? 0),
        completionRate: Math.max(existing.completionRate, entry.completionRate ?? 0),
        seekCount: existing.seekCount + (entry.seekDelta ?? 0),
        replayCount: existing.replayCount + (entry.replayDelta ?? 0),
        lastSeenAt: entry.observedAt,
      },
    });
  },

  async listContentEngagementRecords(
    query: ListContentEngagementQuery,
    pagination: PaginationParams,
  ) {
    return prisma.contentEngagement.findMany({
      where: toContentEngagementWhereInput(query),
      select: CONTENT_ENGAGEMENT_SELECT,
      orderBy: { lastSeenAt: "desc" },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });
  },

  async listContentEngagementSummaryRecords(query: TelemetryEngagementQuery) {
    return prisma.contentEngagement.findMany({
      where: toContentEngagementWhereInput(query),
      select: CONTENT_ENGAGEMENT_SELECT,
      orderBy: { lastSeenAt: "desc" },
      take: 500,
    });
  },

  async countContentEngagementRecords(query: ListContentEngagementQuery) {
    return prisma.contentEngagement.count({ where: toContentEngagementWhereInput(query) });
  },

  async listContentEngagementDetailRecords(input: {
    days: number;
    contentId?: string | null;
    path?: string | null;
  }) {
    return prisma.contentEngagement.findMany({
      where: {
        firstSeenAt: { gte: getPeriodStart(input.days) },
        contentId: input.contentId ?? undefined,
        path: input.contentId ? undefined : (input.path ?? undefined),
        session: { is: { isLikelyBot: false } },
      },
      select: CONTENT_ENGAGEMENT_SELECT,
      orderBy: { lastSeenAt: "desc" },
      take: 500,
    });
  },

  async getAudioEngagementForContent(input: {
    days: number;
    articleId?: string | null;
    path?: string | null;
  }) {
    return prisma.audioEngagement.aggregate({
      where: {
        firstSeenAt: { gte: getPeriodStart(input.days) },
        articleId: input.articleId ?? undefined,
        path: input.articleId ? undefined : (input.path ?? undefined),
        session: { is: { isLikelyBot: false } },
      },
      _count: { _all: true },
      _avg: { listenedMs: true, completionRate: true },
      _sum: { seekCount: true, replayCount: true },
    });
  },
};
