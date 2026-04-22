import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getAuthSessionFromHeaders } from "@/lib/server/auth/session";

import type { UserRole } from "@/lib/server/auth/roles";
import type { AuthSession } from "@/lib/server/auth/types";

export const getCmsSession = cache(async (): Promise<AuthSession | null> => {
  const requestHeaders = await headers();
  return getAuthSessionFromHeaders(new Headers(requestHeaders));
});

export async function requireCmsSession(nextPath = "/cms") {
  const session = await getCmsSession();

  if (!session) {
    redirect(`/cms/login?next=${encodeURIComponent(nextPath)}`);
  }

  return session;
}

export function hasCmsRole(session: AuthSession, role: UserRole) {
  return session.user.role === role;
}
