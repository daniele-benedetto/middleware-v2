import "server-only";

import { TRPCError } from "@trpc/server";

import { Prisma } from "@/lib/generated/prisma/client";
import { getAuthSession } from "@/lib/server/auth/session";
import { ApiError } from "@/lib/server/http/api-error";
import {
  getRequestClientIp,
  getRequestId,
  getRequestPath,
  getRequestUserAgent,
} from "@/lib/server/http/request";
import { auditLogsService } from "@/lib/server/modules/audit-logs";

import type { AuthSession } from "@/lib/server/auth/types";
import type { AuditLogEntryOutcome } from "@/lib/server/modules/audit-logs";

type AuditPayload = {
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
};

type AuditActionOptions = {
  outcome: AuditLogEntryOutcome;
  error?: unknown;
  session?: AuthSession | null;
};

const AUDIT_ERROR_MESSAGE_MAX_LENGTH = 500;

function truncateValue(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function readAuditErrorCode(error: unknown) {
  if (error instanceof ApiError) {
    return error.code;
  }

  if (error instanceof TRPCError) {
    return error.code;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code;
  }

  if (error instanceof Error && error.name && error.name !== "Error") {
    return error.name;
  }

  return undefined;
}

function readAuditErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const message = error.message.trim();
  return message ? truncateValue(message, AUDIT_ERROR_MESSAGE_MAX_LENGTH) : undefined;
}

export async function auditAction(
  request: Request,
  payload: AuditPayload,
  options: AuditActionOptions,
): Promise<void> {
  const resolvedSession = options.session ?? (await getAuthSession(request));
  const auditRecord = {
    actorId: resolvedSession?.user.id ?? null,
    actorEmail: resolvedSession?.user.email ?? null,
    actorRole: resolvedSession?.user.role ?? null,
    action: payload.action,
    resource: payload.resource,
    resourceId: payload.resourceId ?? null,
    outcome: options.outcome,
    errorCode: readAuditErrorCode(options.error) ?? null,
    errorMessage: readAuditErrorMessage(options.error) ?? null,
    method: request.method,
    path: getRequestPath(request),
    ipAddress: getRequestClientIp(request),
    userAgent: getRequestUserAgent(request),
    requestId: getRequestId(request),
    metadata: payload.metadata,
  };

  try {
    await auditLogsService.record(auditRecord);
  } catch (error) {
    console.error("AUDIT_LOG_WRITE_FAILED", error);
    console.info(
      JSON.stringify({
        ...auditRecord,
        timestamp: new Date().toISOString(),
        persistence: "console-fallback",
      }),
    );
  }
}
