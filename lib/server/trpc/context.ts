import "server-only";

import { getAuthSession } from "@/lib/server/auth/session";

import type { AuthSession } from "@/lib/server/auth/types";

export type TrpcContext = {
  request: Request;
  session: AuthSession | null;
};

type CreateContextOptions = {
  request: Request;
};

export async function createTrpcContext(options: CreateContextOptions): Promise<TrpcContext> {
  return {
    request: options.request,
    session: await getAuthSession(options.request),
  };
}
