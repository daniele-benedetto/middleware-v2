import "server-only";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import type { UserRole } from "@/lib/server/auth/roles";
import type { AuthSession } from "@/lib/server/auth/types";

export async function getAuthSession(request: Request): Promise<AuthSession | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!dbUser) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: dbUser.role as UserRole,
    },
  };
}
