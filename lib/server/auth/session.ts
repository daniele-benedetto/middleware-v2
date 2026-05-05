import "server-only";

import { auth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/server/auth/roles";

import type { UserRole } from "@/lib/server/auth/roles";
import type { AuthSession } from "@/lib/server/auth/types";

function isUserRole(value: string): value is UserRole {
  return value === USER_ROLES.ADMIN || value === USER_ROLES.EDITOR;
}

async function resolveSession(headers: Headers): Promise<AuthSession | null> {
  const session = await auth.api.getSession({
    headers,
  });

  if (!session?.user || !isUserRole(session.user.role)) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    },
  };
}

export async function getAuthSession(request: Request): Promise<AuthSession | null> {
  return resolveSession(request.headers);
}

export async function getAuthSessionFromHeaders(headers: Headers): Promise<AuthSession | null> {
  return resolveSession(headers);
}
