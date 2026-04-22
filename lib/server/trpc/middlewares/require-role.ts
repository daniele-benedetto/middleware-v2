import "server-only";

import { TRPCError } from "@trpc/server";

import { trpc } from "@/lib/server/trpc/init";

import type { UserRole } from "@/lib/server/auth/roles";

export function requireRoleMiddleware(allowedRoles: readonly UserRole[]) {
  return trpc.middleware(async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(ctx.session.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Insufficient permissions",
      });
    }

    return next();
  });
}
