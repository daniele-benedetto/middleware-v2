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
    const fallbackPayload: AuditPayload = {
      action: "unknown",
      resource: "unknown",
    };

    try {
      await auditAction(ctx.request, buildPayload(input as TInput));
    } catch {
      await auditAction(ctx.request, fallbackPayload);
    }

    return next();
  });
}
