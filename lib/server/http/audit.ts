import { getAuthSession } from "@/lib/server/auth/session";

type AuditPayload = {
  action: string;
  resource: string;
  resourceId?: string;
};

export async function auditAction(request: Request, payload: AuditPayload): Promise<void> {
  const session = await getAuthSession(request);

  console.info(
    JSON.stringify({
      actorId: session?.user.id ?? null,
      role: session?.user.role ?? null,
      action: payload.action,
      resource: payload.resource,
      resourceId: payload.resourceId ?? null,
      timestamp: new Date().toISOString(),
    }),
  );
}
