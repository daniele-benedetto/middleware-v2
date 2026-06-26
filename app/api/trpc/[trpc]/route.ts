import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { getRequestId, getRequestPath } from "@/lib/server/http/request";
import { logServerEvent } from "@/lib/server/observability/log";
import { createTrpcContext } from "@/lib/server/trpc/context";
import { appRouter } from "@/lib/server/trpc/routers";

const endpoint = "/api/trpc";

const handler = (request: Request) => {
  return fetchRequestHandler({
    endpoint,
    req: request,
    router: appRouter,
    createContext: () => createTrpcContext({ request }),
    onError({ error, path, type }) {
      logServerEvent({
        event: "TRPC_REQUEST_ERROR",
        level: "error",
        requestId: getRequestId(request),
        path: getRequestPath(request),
        method: request.method,
        metadata: {
          procedurePath: path,
          procedureType: type,
          code: error.code,
        },
        error,
      });
    },
  });
};

export { handler as GET, handler as POST };
