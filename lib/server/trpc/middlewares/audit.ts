import "server-only";

import { auditAction } from "@/lib/server/http/audit";
import { trpc } from "@/lib/server/trpc/init";

type AuditPayload = {
  action: string;
  resource: string;
  resourceId?: string;
};

type BuildAuditPayload<TInput> = (input: TInput) => AuditPayload;

export function auditMiddleware<TInput>(buildPayload: BuildAuditPayload<TInput>) {
  return trpc.middleware(async ({ ctx, input, next }) => {
    let payload: AuditPayload = {
      action: "unknown",
      resource: "unknown",
    };

    try {
      payload = buildPayload(input as TInput);
    } catch {
      payload = {
        action: "unknown",
        resource: "unknown",
      };
    }

    const result = await next();

    if (result.ok) {
      await auditAction(ctx.request, payload, {
        outcome: "SUCCESS",
        session: ctx.session,
      });

      return result;
    }

    await auditAction(ctx.request, payload, {
      outcome: "FAILURE",
      error: result.error,
      session: ctx.session,
    });

    return result;
  });
}
