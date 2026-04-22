import "server-only";

import { auth } from "@/lib/auth";

import type { AuthSession } from "@/lib/server/auth/types";

export async function getAuthSession(request: Request): Promise<AuthSession | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return null;
  }

  return session as unknown as AuthSession;
}
