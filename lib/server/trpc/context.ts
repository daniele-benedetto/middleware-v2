import "server-only";

import { getAuthSession } from "@/lib/server/auth/session";

import type { AuthSession } from "@/lib/server/auth/types";

export type TrpcContext = {
  request: Request;
  responseHeaders: Headers;
  session: AuthSession | null;
};

type CreateContextOptions = {
  request: Request;
};

export async function createTrpcContext(options: CreateContextOptions): Promise<TrpcContext> {
  return {
    request: options.request,
    responseHeaders: new Headers(),
    session: await getAuthSession(options.request),
  };
}
