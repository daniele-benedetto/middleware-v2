import "server-only";

import { TRPCError } from "@trpc/server";

import { trpc } from "@/lib/server/trpc/init";

export const requireSessionMiddleware = trpc.middleware(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});
