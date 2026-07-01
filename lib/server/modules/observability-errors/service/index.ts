import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import {
  createObservabilityErrorFingerprint,
  deriveObservabilityVisitorHash,
  observabilityDefaults,
  parseObservabilityMetadata,
  redactObservabilityText,
} from "@/lib/server/modules/observability/model";

import type {
  ObservabilityErrorSeverity as PrismaObservabilityErrorSeverity,
  ObservabilityErrorSource as PrismaObservabilityErrorSource,
  ObservabilityImpactArea as PrismaObservabilityImpactArea,
  ObservabilityUserImpact as PrismaObservabilityUserImpact,
} from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  ObservabilityErrorGroupDetailDto,
  ObservabilityErrorGroupDto,
  ObservabilityErrorOccurrenceDto,
} from "@/lib/server/modules/observability-errors/dto";
import type {
  ListObservabilityErrorsQuery,
  ObservabilityErrorActionContext,
  ObservabilityErrorSeverity,
  ObservabilityErrorSource,
  ObservabilityErrorStatus,
  ObservabilityImpactArea,
  ObservabilityUserImpact,
  RecordObservabilityErrorInput,
} from "@/lib/server/modules/observability-errors/schema";

type ObservabilityErrorRequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
  country?: string | null;
  method?: string | null;
  requestId?: string | null;
};

type ErrorGroupRecord = {
  id: string;
  fingerprint: string;
  fingerprintVersion: number;
  errorSignature: string;
  title: string;
  source: string;
  severity: string;
  status: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  occurrenceCount: number;
  affectedSessions: number;
  affectedPaths: unknown;
  impactArea: string;
  userImpact: string;
  regression: boolean;
  priorityScore: number;
  priorityReasons: unknown;
  firstRelease: string | null;
  lastRelease: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  reopenedAt: Date | null;
  reopenedBy: string | null;
  lastStatusAt: Date;
  lastStatusBy: string | null;
};

type ErrorOccurrenceRecord = {
  id: string;
  sessionId: string | null;
  requestId: string | null;
  correlationId: string | null;
  path: string | null;
  routePath: string | null;
  routeType: string | null;
  method: string | null;
  statusCode: number | null;
  actionContext: string | null;
  userAgent: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  stackTraceRedacted: string | null;
  metadata: unknown;
  occurredAt: Date;
};

type ErrorGroupDetailRecord = ErrorGroupRecord & { occurrences: ErrorOccurrenceRecord[] };

async function getRepository() {
  const { observabilityErrorsRepository } =
    await import("@/lib/server/modules/observability-errors/repository");
  return observabilityErrorsRepository;
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function truncate(value: string | null | undefined, maxLength: number) {
  const normalizedValue = value ? normalizeWhitespace(value) : null;
  return normalizedValue ? normalizedValue.slice(0, maxLength) : null;
}

function normalizePath(value: string | null | undefined) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return null;

  try {
    const url = new URL(trimmedValue, "https://observability.local");
    return url.pathname.slice(0, 512) || "/";
  } catch {
    return null;
  }
}

function readCountry(value: string | null | undefined) {
  const normalizedValue = value?.trim().toUpperCase();
  return normalizedValue && normalizedValue.length === 2 ? normalizedValue : null;
}

function parseStackFrames(stack: string | null | undefined) {
  if (!stack) return [];

  return stack
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^at\s+(.*?)\s+\((.*)\)$/) ?? line.match(/^at\s+(.*)$/);
      const functionName = match?.[1] ?? "anonymous";
      const modulePath = match?.[2] ?? match?.[1] ?? line;
      return {
        functionName,
        modulePath,
        vendor: modulePath.includes("node_modules") || modulePath.includes("webpack-internal"),
      };
    });
}

function createTitle(name: string | null, message: string) {
  return truncate(`${name ? `${name}: ` : ""}${message}`, 180) ?? "Unknown error";
}

function normalizeActionContext(value: string | null | undefined): ObservabilityErrorActionContext {
  const text = (value ?? "").toLowerCase();
  if (text.includes("role")) return "role_change";
  if (text.includes("login") || text.includes("auth")) return "login";
  if (text.includes("unpublish")) return "unpublish";
  if (text.includes("publish")) return "publish";
  if (text.includes("upload")) return "upload_media";
  if (text.includes("delete") && text.includes("media")) return "delete_media";
  if (text.includes("delete")) return "delete_content";
  if (text.includes("navigation")) return "update_navigation";
  if (text.includes("save") || text.includes("editor")) return "save_editorial";
  return "unknown";
}

function deriveImpactArea(input: {
  path?: string | null;
  routePath?: string | null;
  actionContext?: string | null;
}): ObservabilityImpactArea {
  const action = normalizeActionContext(input.actionContext);
  const text =
    `${input.path ?? ""} ${input.routePath ?? ""} ${input.actionContext ?? ""}`.toLowerCase();

  if (action === "login" || action === "role_change" || text.includes("auth")) return "auth";
  if (
    action === "publish" ||
    action === "unpublish" ||
    action === "save_editorial" ||
    action === "delete_content" ||
    text.includes("article") ||
    text.includes("issue") ||
    text.includes("editorial")
  ) {
    return "editorial";
  }
  if (action === "upload_media" || action === "delete_media" || text.includes("media"))
    return "media";
  if (text.includes("/cms")) return "cms";
  if (input.path?.startsWith("/")) return "public_site";
  return "unknown";
}

function deriveUserImpact(input: {
  actionContext: ObservabilityErrorActionContext;
  statusCode?: number | null;
  source: ObservabilityErrorSource;
}): ObservabilityUserImpact {
  if (input.actionContext === "save_editorial") return "lost_content";
  if (
    input.actionContext === "login" ||
    input.actionContext === "publish" ||
    input.actionContext === "upload_media" ||
    input.actionContext === "role_change"
  ) {
    return "blocked_action";
  }
  if (input.statusCode && input.statusCode >= 500) return "minor";
  if (input.source === "boundary") return "minor";
  return "none";
}

function deriveSeverity(input: {
  source: ObservabilityErrorSource;
  statusCode?: number | null;
  actionContext: ObservabilityErrorActionContext;
  impactArea: ObservabilityImpactArea;
  userImpact: ObservabilityUserImpact;
}): ObservabilityErrorSeverity {
  if (input.actionContext === "role_change" || input.userImpact === "lost_content")
    return "critical";
  if (
    input.userImpact === "blocked_action" ||
    input.actionContext === "publish" ||
    input.actionContext === "upload_media" ||
    input.actionContext === "login" ||
    input.statusCode === 500 ||
    input.statusCode === 503 ||
    input.impactArea === "auth"
  ) {
    return "high";
  }
  if (
    input.source === "server" ||
    input.source === "boundary" ||
    input.impactArea === "public_site"
  ) {
    return "medium";
  }
  return "low";
}

function calculatePriority(input: {
  severity: ObservabilityErrorSeverity;
  userImpact: ObservabilityUserImpact;
  impactArea: ObservabilityImpactArea;
  actionContext: ObservabilityErrorActionContext;
  statusCode?: number | null;
}) {
  const severityBase = { low: 10, medium: 40, high: 70, critical: 90 }[input.severity];
  const reasons = [`severity:${input.severity}`];
  let score = severityBase;

  if (input.userImpact === "blocked_action") {
    score += 20;
    reasons.push("blocked_action");
  }
  if (input.userImpact === "lost_content") {
    score += 30;
    reasons.push("lost_content");
  }
  if (input.impactArea === "auth" || input.actionContext === "role_change") {
    score += 15;
    reasons.push("sensitive_area");
  }
  if (input.statusCode && input.statusCode >= 500) {
    score += 10;
    reasons.push("server_5xx");
  }

  return { score: Math.min(100, score), reasons };
}

function toPrismaSource(value: ObservabilityErrorSource) {
  return value.toUpperCase() as PrismaObservabilityErrorSource;
}

function toPrismaSeverity(value: ObservabilityErrorSeverity) {
  return value.toUpperCase() as PrismaObservabilityErrorSeverity;
}

function toPrismaImpactArea(value: ObservabilityImpactArea) {
  return value.toUpperCase() as PrismaObservabilityImpactArea;
}

function toPrismaUserImpact(value: ObservabilityUserImpact) {
  return value.toUpperCase() as PrismaObservabilityUserImpact;
}

function toLowerEnum(value: string) {
  return value.toLowerCase();
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toOccurrenceDto(record: ErrorOccurrenceRecord): ObservabilityErrorOccurrenceDto {
  return {
    id: record.id,
    sessionId: record.sessionId,
    requestId: record.requestId,
    correlationId: record.correlationId,
    path: record.path,
    routePath: record.routePath,
    routeType: record.routeType,
    method: record.method,
    statusCode: record.statusCode,
    actionContext: record.actionContext,
    userAgent: record.userAgent,
    deviceType: record.deviceType,
    browser: record.browser,
    os: record.os,
    stackTraceRedacted: record.stackTraceRedacted,
    metadata: record.metadata ?? null,
    occurredAt: record.occurredAt.toISOString(),
  };
}

function toGroupDto(record: ErrorGroupRecord): ObservabilityErrorGroupDto {
  return {
    id: record.id,
    title: record.title,
    source: toLowerEnum(record.source) as ObservabilityErrorGroupDto["source"],
    severity: toLowerEnum(record.severity) as ObservabilityErrorGroupDto["severity"],
    status: toLowerEnum(record.status) as ObservabilityErrorGroupDto["status"],
    priorityScore: record.priorityScore,
    priorityReasons: readStringArray(record.priorityReasons),
    occurrenceCount: record.occurrenceCount,
    affectedSessions: record.affectedSessions,
    affectedPaths: readStringArray(record.affectedPaths),
    impactArea: toLowerEnum(record.impactArea) as ObservabilityErrorGroupDto["impactArea"],
    userImpact: toLowerEnum(record.userImpact) as ObservabilityErrorGroupDto["userImpact"],
    regression: record.regression,
    firstSeenAt: record.firstSeenAt.toISOString(),
    lastSeenAt: record.lastSeenAt.toISOString(),
    firstRelease: record.firstRelease,
    lastRelease: record.lastRelease,
  };
}

function toGroupDetailDto(record: ErrorGroupDetailRecord): ObservabilityErrorGroupDetailDto {
  return {
    ...toGroupDto(record),
    fingerprint: record.fingerprint,
    fingerprintVersion: record.fingerprintVersion,
    errorSignature: record.errorSignature,
    resolvedAt: record.resolvedAt?.toISOString() ?? null,
    resolvedBy: record.resolvedBy,
    reopenedAt: record.reopenedAt?.toISOString() ?? null,
    reopenedBy: record.reopenedBy,
    lastStatusAt: record.lastStatusAt.toISOString(),
    lastStatusBy: record.lastStatusBy,
    occurrences: record.occurrences.map(toOccurrenceDto),
  };
}

const allowedStatusTransitions: Record<ObservabilityErrorStatus, ObservabilityErrorStatus[]> = {
  open: ["investigating", "resolved", "ignored"],
  investigating: ["open", "resolved", "ignored"],
  resolved: ["open", "ignored"],
  ignored: ["open", "investigating"],
};

function assertStatusTransition(from: ObservabilityErrorStatus, to: ObservabilityErrorStatus) {
  if (from === to) return;
  if (allowedStatusTransitions[from].includes(to)) return;

  throw new ApiError(400, "VALIDATION_ERROR", `Cannot transition error from ${from} to ${to}`);
}

export const observabilityErrorsService = {
  normalizeActionContext,
  deriveImpactArea,
  deriveSeverity,
  calculatePriority,
  async recordOccurrence(
    input: RecordObservabilityErrorInput,
    context: ObservabilityErrorRequestContext,
  ) {
    const now = new Date();
    const path = normalizePath(input.path);
    const routePath = normalizePath(input.routePath);
    const message = redactObservabilityText(input.message, 1000) ?? "Unknown error";
    const name = redactObservabilityText(input.name, 120);
    const actionContext = normalizeActionContext(input.actionContext ?? routePath ?? path);
    const impactArea = deriveImpactArea({ path, routePath, actionContext });
    const userImpact = deriveUserImpact({
      actionContext,
      statusCode: input.statusCode,
      source: input.source,
    });
    const severity = deriveSeverity({
      source: input.source,
      statusCode: input.statusCode,
      actionContext,
      impactArea,
      userImpact,
    });
    const priority = calculatePriority({
      severity,
      userImpact,
      impactArea,
      actionContext,
      statusCode: input.statusCode,
    });
    const fingerprint = createObservabilityErrorFingerprint({
      errorType: name ?? input.source,
      message,
      impactArea,
      routeTemplate: routePath,
      method: input.method ?? context.method,
      statusCode: input.statusCode,
      stackFrames: parseStackFrames(input.stack),
      fingerprintVersion: observabilityDefaults.fingerprintVersion,
    });
    const visitorHash = deriveObservabilityVisitorHash({
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      date: now,
      saltSecret: process.env.ANALYTICS_SALT_SECRET ?? "",
    });
    const metadata = parseObservabilityMetadata(input.metadata) as
      | Prisma.InputJsonValue
      | undefined;
    const repository = await getRepository();

    return repository.recordOccurrence({
      session: input.sessionId
        ? {
            id: input.sessionId,
            visitorHash,
            observedAt: now,
            landingPath: path,
            country: readCountry(context.country),
            userAgent: truncate(context.userAgent, 500),
            isLikelyBot: input.isLikelyBot,
          }
        : null,
      event: {
        sessionId: input.sessionId ?? null,
        visitorHash,
        type: `${input.source}_error`,
        path,
        pageType: truncate(input.pageType, 80),
        contentId: truncate(input.contentId, 120),
        contentType: truncate(input.contentType, 80),
        requestId: truncate(input.requestId ?? context.requestId, 200),
        correlationId: truncate(input.correlationId, 200),
        release: truncate(input.release, 120),
        sampleRate: input.sampleRate ?? 1,
        clientSequence: input.clientSequence ?? null,
        clientElapsedMs: input.clientElapsedMs ?? null,
        metadata,
        receivedAtServer: now,
      },
      group: {
        fingerprint: fingerprint.fingerprint,
        fingerprintVersion: fingerprint.fingerprintVersion,
        errorSignature: fingerprint.errorSignature,
        title: createTitle(name, message),
        source: toPrismaSource(input.source),
        severity: toPrismaSeverity(severity),
        impactArea: toPrismaImpactArea(impactArea),
        userImpact: toPrismaUserImpact(userImpact),
        priorityScore: priority.score,
        priorityReasons: priority.reasons,
        release: truncate(input.release, 120),
        path,
      },
      occurrence: {
        sessionId: input.sessionId ?? null,
        requestId: truncate(input.requestId ?? context.requestId, 200),
        correlationId: truncate(input.correlationId, 200),
        path,
        routePath,
        routeType: truncate(input.routeType, 80),
        method: truncate(input.method ?? context.method, 20),
        statusCode: input.statusCode ?? null,
        actionContext,
        userAgent: truncate(context.userAgent, 500),
        stackTraceRedacted: redactObservabilityText(input.stack, 8000),
        metadata,
        occurredAt: now,
      },
    });
  },
  async recordServerError(
    input: Omit<RecordObservabilityErrorInput, "source">,
    context: ObservabilityErrorRequestContext,
  ) {
    return this.recordOccurrence({ ...input, source: "server" }, context);
  },
  async listGroups(query: ListObservabilityErrorsQuery, pagination: PaginationParams) {
    const repository = await getRepository();
    const [items, total] = await Promise.all([
      repository.listGroups(query, pagination),
      repository.countGroups(query),
    ]);

    return { items: (items as ErrorGroupRecord[]).map(toGroupDto), total };
  },
  async getGroupById(id: string) {
    const repository = await getRepository();
    const record = (await repository.getGroupById(id)) as ErrorGroupDetailRecord | null;

    if (!record) {
      throw new ApiError(404, "NOT_FOUND", "Observability error group not found");
    }

    return toGroupDetailDto(record);
  },
  async updateStatus(id: string, status: ObservabilityErrorStatus, actorId?: string | null) {
    const repository = await getRepository();
    const current = await repository.getGroupStatusById(id);

    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "Observability error group not found");
    }

    assertStatusTransition(toLowerEnum(current.status) as ObservabilityErrorStatus, status);

    const record = (await repository.updateStatus(id, status, actorId)) as ErrorGroupRecord;
    return toGroupDto(record);
  },
};
