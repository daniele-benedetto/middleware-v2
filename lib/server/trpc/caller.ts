import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { createTrpcContext } from "@/lib/server/trpc/context";
import { appRouter } from "@/lib/server/trpc/routers";

const TRPC_CALLER_REQUEST_URL = "http://localhost/trpc-caller";

export const getTrpcCaller = cache(async () => {
  const requestHeaders = await headers();
  const request = new Request(TRPC_CALLER_REQUEST_URL, {
    headers: new Headers(requestHeaders),
  });
  const context = await createTrpcContext({ request });

  return appRouter.createCaller(context);
});
