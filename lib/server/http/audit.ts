import { getAuthSession } from "@/lib/server/auth/session";

import type { AuthSession } from "@/lib/server/auth/types";

type AuditPayload = {
  action: string;
  resource: string;
  resourceId?: string;
};

export async function auditAction(
  request: Request,
  payload: AuditPayload,
  session: AuthSession | null = null,
): Promise<void> {
  const resolvedSession = session ?? (await getAuthSession(request));

  console.info(
    JSON.stringify({
      actorId: resolvedSession?.user.id ?? null,
      role: resolvedSession?.user.role ?? null,
      action: payload.action,
      resource: payload.resource,
      resourceId: payload.resourceId ?? null,
      timestamp: new Date().toISOString(),
    }),
  );
}
