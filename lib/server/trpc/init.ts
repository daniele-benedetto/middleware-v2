import "server-only";

import { initTRPC } from "@trpc/server";
import superjson from "superjson";

import { toTrpcError } from "@/lib/server/trpc/errors";

import type { TrpcContext } from "@/lib/server/trpc/context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (error.code === "BAD_REQUEST" && error.cause) {
      return {
        ...shape,
        data: {
          ...shape.data,
          details: error.cause,
        },
      };
    }

    return shape;
  },
});

const mapApiErrorMiddleware = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    throw toTrpcError(error);
  }
});

export const trpc = t;
export const router = t.router;
export const publicProcedure = t.procedure.use(mapApiErrorMiddleware);
