import "server-only";

import { getRequestId, getRequestPath } from "@/lib/server/http/request";
import { observabilityAuditService } from "@/lib/server/modules/observability-audit";

import type { AuthSession } from "@/lib/server/auth/types";
import type {
  AuditActivityDescriptor,
  AuditActorSnapshot,
  AuditRequestContext,
  AuditSnapshot,
} from "@/lib/server/modules/observability-audit";

function actorFromSession(session: AuthSession | null | undefined): AuditActorSnapshot | null {
  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    role: session.user.role,
  };
}

function contextFromRequest(request: Request): AuditRequestContext {
  return {
    requestId: getRequestId(request),
    correlationId: request.headers.get("x-correlation-id")?.trim() || null,
    method: request.method,
    path: getRequestPath(request),
  };
}

function logAuditFallback(kind: "SUCCESS" | "FAILURE", payload: unknown, error: unknown) {
  console.error("AUDIT_ACTIVITY_WRITE_FAILED", error);
  console.info(
    JSON.stringify({
      kind,
      payload,
      persistence: "console-fallback",
      timestamp: new Date().toISOString(),
    }),
  );
}

export async function recordAuditSuccess(input: {
  request: Request;
  session?: AuthSession | null;
  activity: AuditActivityDescriptor;
  before: AuditSnapshot | null;
  after: AuditSnapshot | null;
}) {
  try {
    await observabilityAuditService.recordSuccess({
      ...input.activity,
      actor: actorFromSession(input.session),
      before: input.before,
      after: input.after,
      context: contextFromRequest(input.request),
    });
  } catch (error) {
    logAuditFallback("SUCCESS", input.activity, error);
  }
}

export async function recordAuditFailure(input: {
  request: Request;
  session?: AuthSession | null;
  activity: AuditActivityDescriptor;
  before: AuditSnapshot | null;
  attempted: AuditSnapshot | null;
  error: unknown;
}) {
  try {
    await observabilityAuditService.recordFailure({
      ...input.activity,
      actor: actorFromSession(input.session),
      before: input.before,
      attempted: input.attempted,
      context: contextFromRequest(input.request),
      error: input.error,
    });
  } catch (error) {
    logAuditFallback("FAILURE", input.activity, error);
  }
}
