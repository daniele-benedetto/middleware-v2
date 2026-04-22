import { auditAction } from "@/lib/server/http/audit";
import { trpc } from "@/lib/server/trpc/init";

type AuditPayload = {
  action: string;
  resource: string;
  resourceId?: string;
};

type BuildAuditPayloadArgs = {
  input: unknown;
};

type BuildAuditPayload = (args: BuildAuditPayloadArgs) => AuditPayload;

export function auditMiddleware(buildPayload: BuildAuditPayload) {
  return trpc.middleware(async ({ ctx, input, next }) => {
    await auditAction(ctx.request, buildPayload({ input }));
    return next();
  });
}
