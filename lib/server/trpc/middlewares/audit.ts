import "server-only";

import { recordAuditFailure, recordAuditSuccess } from "@/lib/server/http/audit";
import {
  captureAuditResourceSnapshot,
  createAuditAttemptSnapshot,
  createAuditSnapshotFromRecord,
} from "@/lib/server/modules/observability-audit";
import { trpc } from "@/lib/server/trpc/init";

import type {
  AuditActivityDescriptor,
  AuditSnapshot,
  ObservabilityAuditAction,
  ObservabilityAuditResourceType,
} from "@/lib/server/modules/observability-audit";

type AuditMiddlewareContext<TInput> = {
  input: TInput;
};

type AuditMiddlewareSuccessContext<TInput> = AuditMiddlewareContext<TInput> & {
  data: unknown;
};

type AuditMiddlewareOptions<TInput> = {
  buildActivity: (context: AuditMiddlewareContext<TInput>) => AuditActivityDescriptor;
  captureBefore?: (context: AuditMiddlewareContext<TInput>) => Promise<AuditSnapshot | null>;
  captureAfter?: (context: AuditMiddlewareSuccessContext<TInput>) => Promise<AuditSnapshot | null>;
  buildAttemptedSummary?: (context: AuditMiddlewareContext<TInput>) => AuditSnapshot | null;
};

function fallbackActivity(): AuditActivityDescriptor {
  return {
    action: "unknown",
    resourceType: "unknown",
  };
}

async function safeCaptureBefore<TInput>(
  options: AuditMiddlewareOptions<TInput>,
  context: AuditMiddlewareContext<TInput>,
) {
  if (!options.captureBefore) return null;

  try {
    return await options.captureBefore(context);
  } catch {
    return null;
  }
}

async function safeCaptureAfter<TInput>(
  options: AuditMiddlewareOptions<TInput>,
  context: AuditMiddlewareSuccessContext<TInput>,
) {
  if (!options.captureAfter) return null;

  try {
    return await options.captureAfter(context);
  } catch {
    return null;
  }
}

function safeBuildAttempted<TInput>(
  options: AuditMiddlewareOptions<TInput>,
  context: AuditMiddlewareContext<TInput>,
) {
  try {
    return options.buildAttemptedSummary?.(context) ?? null;
  } catch {
    return null;
  }
}

function safeBuildActivity<TInput>(
  options: AuditMiddlewareOptions<TInput>,
  context: AuditMiddlewareContext<TInput>,
) {
  try {
    return options.buildActivity(context);
  } catch {
    return fallbackActivity();
  }
}

export function auditMiddleware<TInput>(options: AuditMiddlewareOptions<TInput>) {
  return trpc.middleware(async ({ ctx, input, next }) => {
    const context = { input: input as TInput };
    const activity = safeBuildActivity(options, context);
    const before = await safeCaptureBefore(options, context);
    const result = await next();

    if (result.ok) {
      const after = await safeCaptureAfter(options, { ...context, data: result.data });

      await recordAuditSuccess({
        request: ctx.request,
        session: ctx.session,
        activity,
        before,
        after,
      });

      return result;
    }

    await recordAuditFailure({
      request: ctx.request,
      session: ctx.session,
      activity,
      before,
      attempted: safeBuildAttempted(options, context),
      error: result.error,
    });

    return result;
  });
}

export function auditResourceMiddleware<TInput>(
  buildActivity: (input: TInput) => {
    action: ObservabilityAuditAction;
    resourceType: ObservabilityAuditResourceType;
    resourceId?: string | null;
    metadata?: AuditActivityDescriptor["metadata"];
  },
) {
  return auditMiddleware<TInput>({
    buildActivity: ({ input }) => buildActivity(input),
    captureBefore: async ({ input }) => {
      const activity = buildActivity(input);
      if (activity.resourceType === "media") {
        return createAuditAttemptSnapshot({
          resourceType: "media",
          title: activity.resourceId ?? "media",
          values: { id: activity.resourceId ?? null },
        });
      }
      return captureAuditResourceSnapshot(activity.resourceType, activity.resourceId);
    },
    captureAfter: async ({ data, input }) => {
      const activity = buildActivity(input);
      return createAuditSnapshotFromRecord(activity.resourceType, data);
    },
    buildAttemptedSummary: ({ input }) => {
      const activity = buildActivity(input);
      return createAuditAttemptSnapshot({
        resourceType: activity.resourceType,
        title: activity.resourceId ?? activity.resourceType,
        values: input && typeof input === "object" ? (input as Record<string, unknown>) : { input },
      });
    },
  });
}
