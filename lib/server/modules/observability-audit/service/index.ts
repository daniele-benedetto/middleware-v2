import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/server/http/api-error";
import { observabilityAuditRepository } from "@/lib/server/modules/observability-audit/repository";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  ObservabilityAuditActivityDetailDto,
  ObservabilityAuditActivityDto,
  ObservabilityAuditSummaryDto,
} from "@/lib/server/modules/observability-audit/dto";
import type {
  AuditActivityRecord,
  AuditActivityDetailRecord,
} from "@/lib/server/modules/observability-audit/repository";
import type {
  ListObservabilityAuditQuery,
  ObservabilityAuditAction,
  ObservabilityAuditChangeType,
  ObservabilityAuditResourceType,
  ObservabilityAuditRiskLevel,
} from "@/lib/server/modules/observability-audit/schema";
import type {
  AuditActorSnapshot,
  AuditChangeInput,
  AuditSnapshot,
  AuditSummary,
  RecordAuditFailureInput,
  RecordAuditSuccessInput,
} from "@/lib/server/modules/observability-audit/types";

const TEXT_MAX_LENGTH = 240;
const JSON_TEXT_MAX_LENGTH = 500;
const MAX_DIFF_FIELDS = 50;

const sensitiveKeyPattern = /(password|token|secret|authorization|cookie|credential|session)/i;
const publicActions = new Set<ObservabilityAuditAction>([
  "publish",
  "unpublish",
  "delete",
  "update_navigation",
  "remove_media",
]);
const criticalActions = new Set<ObservabilityAuditAction>(["change_role"]);
const highActions = new Set<ObservabilityAuditAction>([
  "publish",
  "unpublish",
  "delete",
  "remove_media",
  "update_navigation",
]);

async function getAggregatesService() {
  const { observabilityAggregatesService } =
    await import("@/lib/server/modules/observability-aggregates/service");
  return observabilityAggregatesService;
}

function truncate(value: string | null | undefined, maxLength = TEXT_MAX_LENGTH) {
  if (!value) return null;
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function sanitizeJson(value: unknown, depth = 0): Prisma.InputJsonValue | null {
  if (value == null) return null;
  if (typeof value === "string") return truncate(value, JSON_TEXT_MAX_LENGTH) ?? "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth > 3) return "[redacted-depth]";
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeJson(item, depth + 1));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 40)
        .map(([key, item]) => [
          key,
          sensitiveKeyPattern.test(key) ? "[redacted]" : sanitizeJson(item, depth + 1),
        ]),
    );
  }
  return String(value);
}

function summaryToJson(summary: AuditSummary | null): Prisma.InputJsonValue | null {
  return summary ? (sanitizeJson(summary) as Prisma.InputJsonValue) : null;
}

function snapshotToJson(
  snapshot: AuditSnapshot | AuditActorSnapshot | null,
): Prisma.InputJsonValue | null {
  return snapshot ? (sanitizeJson(snapshot) as Prisma.InputJsonValue) : null;
}

function readSummary(value: unknown): AuditSummary | null {
  if (!isPlainObject(value)) return null;

  return {
    title: typeof value.title === "string" ? value.title : "Risorsa audit",
    description: typeof value.description === "string" ? value.description : null,
    fields: Array.isArray(value.fields)
      ? value.fields.filter(isPlainObject).map((field) => ({
          label: typeof field.label === "string" ? field.label : "Campo",
          value: typeof field.value === "string" ? field.value : String(field.value ?? "-"),
        }))
      : [],
    publicFlags: Array.isArray(value.publicFlags)
      ? value.publicFlags.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function readActorSnapshot(value: unknown): AuditActorSnapshot | null {
  if (!isPlainObject(value)) return null;
  return {
    id: typeof value.id === "string" ? value.id : null,
    email: typeof value.email === "string" ? value.email : null,
    name: typeof value.name === "string" ? value.name : null,
    role: value.role === "ADMIN" || value.role === "EDITOR" ? value.role : null,
  };
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toLowerEnum<T extends string>(value: string): T {
  return value.toLowerCase() as T;
}

function readResourceTitle(record: AuditActivityRecord) {
  return (
    readSummary(record.afterSummary)?.title ??
    readSummary(record.beforeSummary)?.title ??
    readSummary(record.attemptedSummary)?.title ??
    null
  );
}

function readActorDisplayName(record: AuditActivityRecord) {
  const actor = readActorSnapshot(record.actorSnapshot);
  return actor?.name || actor?.email || null;
}

function toActivityDto(record: AuditActivityRecord): ObservabilityAuditActivityDto {
  return {
    id: record.id,
    actorId: record.actorId,
    actorDisplayName: readActorDisplayName(record),
    action: record.action as ObservabilityAuditAction,
    resourceType: record.resourceType as ObservabilityAuditResourceType,
    resourceId: record.resourceId,
    resourceTitle: readResourceTitle(record),
    outcome: record.outcome,
    riskLevel: toLowerEnum<ObservabilityAuditRiskLevel>(record.riskLevel),
    riskReasons: readStringArray(record.riskReasons),
    publicImpact: record.publicImpact,
    changedFields: record.changedFields,
    requestId: record.requestId,
    correlationId: record.correlationId,
    errorCode: record.errorCode,
    createdAt: record.createdAt.toISOString(),
  };
}

function toChangeDto(change: AuditActivityDetailRecord["changes"][number]) {
  return {
    id: change.id,
    field: change.field,
    beforeValueRedacted: change.beforeValueRedacted ?? null,
    afterValueRedacted: change.afterValueRedacted ?? null,
    changeType: toLowerEnum<ObservabilityAuditChangeType>(change.changeType),
    createdAt: change.createdAt.toISOString(),
  };
}

function extractErrorCode(error: unknown) {
  if (error instanceof ApiError) return error.code;
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (error instanceof Error && error.name && error.name !== "Error") return error.name;
  return null;
}

function extractErrorMessage(error: unknown) {
  return error instanceof Error ? truncate(error.message, 500) : null;
}

function hasPublicFlag(snapshot: AuditSnapshot | null) {
  if (!snapshot) return false;
  return snapshot.publicFlags.length > 0 || Boolean(snapshot.values.isPublic);
}

function derivePublicImpact(input: {
  action: ObservabilityAuditAction;
  resourceType: ObservabilityAuditResourceType;
  before: AuditSnapshot | null;
  after: AuditSnapshot | null;
  attempted: AuditSnapshot | null;
}) {
  if (input.resourceType === "user") return false;
  if (publicActions.has(input.action)) return true;
  return (
    hasPublicFlag(input.before) || hasPublicFlag(input.after) || hasPublicFlag(input.attempted)
  );
}

function deriveRisk(input: {
  action: ObservabilityAuditAction;
  resourceType: ObservabilityAuditResourceType;
  publicImpact: boolean;
  outcome: "SUCCESS" | "FAILURE";
}) {
  const reasons: string[] = [];

  if (criticalActions.has(input.action) || input.resourceType === "user") {
    reasons.push("security_sensitive");
    if (input.outcome === "FAILURE") reasons.push("failed_sensitive_action");
    return { riskLevel: "critical" as const, riskReasons: reasons };
  }

  if (highActions.has(input.action) && input.publicImpact) {
    reasons.push("public_sensitive_action");
    if (input.outcome === "FAILURE") reasons.push("failed_public_action");
    return { riskLevel: "high" as const, riskReasons: reasons };
  }

  if (input.publicImpact) {
    reasons.push("public_impact");
    return { riskLevel: "medium" as const, riskReasons: reasons };
  }

  if (highActions.has(input.action)) {
    reasons.push("sensitive_non_public_action");
    return { riskLevel: "medium" as const, riskReasons: reasons };
  }

  reasons.push("non_public_change");
  return { riskLevel: "low" as const, riskReasons: reasons };
}

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(sanitizeJson(left)) === JSON.stringify(sanitizeJson(right));
}

function deriveChangeType(input: {
  action: ObservabilityAuditAction;
  before: AuditSnapshot | null;
  after: AuditSnapshot | null;
}): ObservabilityAuditChangeType {
  if (input.action === "delete") return "removed";
  if (input.action === "reorder") return "reordered";
  if (!input.before && input.after) return "created";
  return "updated";
}

function buildChanges(input: {
  action: ObservabilityAuditAction;
  before: AuditSnapshot | null;
  after: AuditSnapshot | null;
}) {
  if (!input.after && !input.before) return [];
  const changeType = deriveChangeType(input);
  const fields = Array.from(
    new Set([
      ...Object.keys(input.before?.values ?? {}),
      ...Object.keys(input.after?.values ?? {}),
    ]),
  )
    .filter((field) => !sensitiveKeyPattern.test(field))
    .slice(0, MAX_DIFF_FIELDS);

  return fields
    .filter((field) => {
      if (changeType === "created" || changeType === "removed") return true;
      return !valuesEqual(input.before?.values[field], input.after?.values[field]);
    })
    .map(
      (field): AuditChangeInput => ({
        field,
        beforeValueRedacted:
          changeType === "created" ? null : (sanitizeJson(input.before?.values[field]) ?? null),
        afterValueRedacted:
          changeType === "removed" ? null : (sanitizeJson(input.after?.values[field]) ?? null),
        changeType,
      }),
    );
}

function buildActivityEntry(input: RecordAuditSuccessInput | RecordAuditFailureInput) {
  const isFailure = "attempted" in input;
  const outcome = isFailure ? ("FAILURE" as const) : ("SUCCESS" as const);
  const attempted = isFailure ? input.attempted : null;
  const after = isFailure ? null : input.after;
  const publicImpact = derivePublicImpact({
    action: input.action,
    resourceType: input.resourceType,
    before: input.before,
    after,
    attempted,
  });
  const risk = deriveRisk({
    action: input.action,
    resourceType: input.resourceType,
    publicImpact,
    outcome,
  });
  const changes = isFailure
    ? []
    : buildChanges({ action: input.action, before: input.before, after });

  return {
    actorId: input.actor?.id ?? null,
    actorSnapshot: snapshotToJson(input.actor),
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    resourceSnapshot: snapshotToJson(after ?? input.before ?? attempted),
    outcome,
    riskLevel: risk.riskLevel,
    riskReasons: risk.riskReasons,
    changedFields: changes.map((change) => change.field),
    beforeSummary: isFailure ? null : summaryToJson(input.before),
    afterSummary: isFailure ? null : summaryToJson(after),
    attemptedSummary: isFailure ? summaryToJson(attempted ?? input.before) : null,
    publicImpact,
    requestId: input.context.requestId ?? null,
    correlationId: input.context.correlationId ?? null,
    reason: truncate(input.reason),
    errorCode: isFailure ? extractErrorCode(input.error) : null,
    errorMessage: isFailure ? extractErrorMessage(input.error) : null,
    metadata: sanitizeJson(input.metadata),
    changes,
  };
}

export function createAuditSnapshot(input: {
  title: string;
  description?: string | null;
  values: Record<string, unknown>;
  publicFlags?: string[];
}): AuditSnapshot {
  const values = Object.fromEntries(
    Object.entries(input.values)
      .filter(([key]) => !sensitiveKeyPattern.test(key))
      .map(([key, value]) => [key, sanitizeJson(value)]),
  );

  return {
    title: truncate(input.title) ?? "Risorsa audit",
    description: truncate(input.description),
    publicFlags: input.publicFlags ?? [],
    values,
    fields: Object.entries(values).map(([label, value]) => ({
      label,
      value: typeof value === "string" ? value : JSON.stringify(value),
    })),
  };
}

function titleFromRecord(record: Record<string, unknown>, fallback: string) {
  return (
    (typeof record.title === "string" && record.title) ||
    (typeof record.name === "string" && record.name) ||
    (typeof record.email === "string" && record.email) ||
    (typeof record.slug === "string" && record.slug) ||
    fallback
  );
}

function publicFlagsFromRecord(
  resourceType: ObservabilityAuditResourceType,
  record: Record<string, unknown>,
) {
  const flags: string[] = [];
  if (record.status === "PUBLISHED") flags.push("published");
  if (record.isFeatured === true) flags.push("featured");
  if (record.isActive === true && resourceType === "issue") flags.push("active_issue");
  if (resourceType === "navigation") flags.push("public_navigation");
  if (resourceType === "media") flags.push("public_media");
  return flags;
}

export function createAuditSnapshotFromRecord(
  resourceType: ObservabilityAuditResourceType,
  record: unknown,
): AuditSnapshot | null {
  if (!isPlainObject(record)) return null;

  const title = titleFromRecord(record, resourceType);
  const values = Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
      if (value == null) return true;
      if (["string", "number", "boolean"].includes(typeof value)) return true;
      if (value instanceof Date) return true;
      return false;
    }),
  );

  return createAuditSnapshot({
    title,
    description: resourceType,
    publicFlags: publicFlagsFromRecord(resourceType, record),
    values: {
      ...values,
      isPublic:
        record.status === "PUBLISHED" ||
        record.isFeatured === true ||
        (resourceType === "navigation" && Boolean(record.key)),
    },
  });
}

export function createAuditAttemptSnapshot(input: {
  resourceType: ObservabilityAuditResourceType;
  title: string;
  values: Record<string, unknown>;
}) {
  return createAuditSnapshot({
    title: input.title,
    description: `${input.resourceType} attempted payload`,
    values: input.values,
  });
}

export async function captureAuditResourceSnapshot(
  resourceType: ObservabilityAuditResourceType,
  resourceId?: string | null,
) {
  if (!resourceId) return null;

  if (resourceType === "article") {
    return createAuditSnapshotFromRecord(
      resourceType,
      await prisma.article.findUnique({ where: { id: resourceId } }),
    );
  }
  if (resourceType === "page") {
    return createAuditSnapshotFromRecord(
      resourceType,
      await prisma.page.findUnique({ where: { id: resourceId } }),
    );
  }
  if (resourceType === "issue") {
    return createAuditSnapshotFromRecord(
      resourceType,
      await prisma.issue.findUnique({ where: { id: resourceId } }),
    );
  }
  if (resourceType === "author") {
    return createAuditSnapshotFromRecord(
      resourceType,
      await prisma.author.findUnique({ where: { id: resourceId } }),
    );
  }
  if (resourceType === "category") {
    return createAuditSnapshotFromRecord(
      resourceType,
      await prisma.category.findUnique({ where: { id: resourceId } }),
    );
  }
  if (resourceType === "tag") {
    return createAuditSnapshotFromRecord(
      resourceType,
      await prisma.tag.findUnique({ where: { id: resourceId } }),
    );
  }
  if (resourceType === "user") {
    return createAuditSnapshotFromRecord(
      resourceType,
      await prisma.user.findUnique({ where: { id: resourceId } }),
    );
  }
  if (resourceType === "navigation") {
    return createAuditSnapshotFromRecord(
      resourceType,
      await prisma.navigationMenu.findUnique({ where: { key: resourceId } }),
    );
  }

  return null;
}

export const observabilityAuditService = {
  createAuditSnapshot,
  createAuditSnapshotFromRecord,
  createAuditAttemptSnapshot,
  captureAuditResourceSnapshot,

  async recordSuccess(input: RecordAuditSuccessInput) {
    return observabilityAuditRepository.create(buildActivityEntry(input));
  },

  async recordFailure(input: RecordAuditFailureInput) {
    return observabilityAuditRepository.create(buildActivityEntry(input));
  },

  async list(query: ListObservabilityAuditQuery, pagination: PaginationParams) {
    const [items, total] = await Promise.all([
      observabilityAuditRepository.list(query, pagination),
      observabilityAuditRepository.count(query),
    ]);

    return {
      items: items.map(toActivityDto),
      total,
    };
  },

  async summary(): Promise<ObservabilityAuditSummaryDto> {
    const aggregateSummary = await (await getAggregatesService()).getAuditSummary();
    if (aggregateSummary) return aggregateSummary;

    return observabilityAuditRepository.summary();
  },

  async detail(id: string): Promise<ObservabilityAuditActivityDetailDto> {
    const record = await observabilityAuditRepository.getById(id);
    if (!record) {
      throw new ApiError(404, "NOT_FOUND", "Audit activity not found");
    }

    const relatedErrors = await observabilityAuditRepository.listRelatedErrors(
      record.requestId,
      record.correlationId,
    );

    return {
      ...toActivityDto(record),
      actorSnapshot: readActorSnapshot(record.actorSnapshot),
      resourceSnapshot: record.resourceSnapshot ?? null,
      beforeSummary: readSummary(record.beforeSummary),
      afterSummary: readSummary(record.afterSummary),
      attemptedSummary: readSummary(record.attemptedSummary),
      reason: record.reason,
      errorMessage: record.errorMessage,
      metadata: record.metadata ?? null,
      changes: record.changes.map(toChangeDto),
      relatedErrors: relatedErrors.map((error) => ({
        id: error.id,
        title: error.title,
        severity: error.severity.toLowerCase(),
        status: error.status.toLowerCase(),
        lastSeenAt: error.lastSeenAt.toISOString(),
      })),
    };
  },
};
