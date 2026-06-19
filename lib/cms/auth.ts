import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { CMS_NEXT_PATH_HEADER, getSafeCmsNextPath } from "@/lib/cms/redirect";
import { getAuthSessionFromHeaders } from "@/lib/server/auth/session";

import type { UserRole } from "@/lib/server/auth/roles";
import type { AuthSession } from "@/lib/server/auth/types";

export const getCmsSession = cache(async (): Promise<AuthSession | null> => {
  const requestHeaders = await headers();
  return getAuthSessionFromHeaders(new Headers(requestHeaders));
});

async function getCmsNextPathFallback() {
  const requestHeaders = await headers();
  return getSafeCmsNextPath(requestHeaders.get(CMS_NEXT_PATH_HEADER));
}

export async function requireCmsSession(nextPath?: string) {
  const session = await getCmsSession();

  if (!session) {
    const resolvedNextPath = getSafeCmsNextPath(nextPath ?? (await getCmsNextPathFallback()));
    redirect(`/cms/login?next=${encodeURIComponent(resolvedNextPath)}`);
  }

  return session;
}

export function hasCmsRole(session: AuthSession, role: UserRole) {
  return session.user.role === role;
}
