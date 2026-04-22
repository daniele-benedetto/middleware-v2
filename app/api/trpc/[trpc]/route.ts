import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTrpcContext } from "@/lib/server/trpc/context";
import { appRouter } from "@/lib/server/trpc/routers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const endpoint = "/api/trpc";

const handler = (request: Request) => {
  return fetchRequestHandler({
    endpoint,
    req: request,
    router: appRouter,
    createContext: () => createTrpcContext({ request }),
  });
};

export { handler as GET, handler as POST };
