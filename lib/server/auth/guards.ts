import { getAuthSession } from "@/lib/server/auth/session";
import { ApiError } from "@/lib/server/http/api-error";

import type { UserRole } from "@/lib/server/auth/roles";
import type { AuthSession } from "@/lib/server/auth/types";

export async function requireSession(request: Request): Promise<AuthSession> {
  const session = await getAuthSession(request);

  if (!session) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  return session;
}

export async function requireRole(
  request: Request,
  allowedRoles: UserRole[],
): Promise<AuthSession> {
  const session = await requireSession(request);
  const role = session.user.role;

  if (!role || !allowedRoles.includes(role)) {
    throw new ApiError(403, "FORBIDDEN", "Insufficient permissions");
  }

  return session;
}
