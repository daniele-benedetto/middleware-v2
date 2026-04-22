import { USER_ROLES } from "@/lib/server/auth/roles";
import { rateLimitPolicies } from "@/lib/server/http/rate-limit";
import { publicProcedure } from "@/lib/server/trpc/init";
import { rateLimitMiddleware } from "@/lib/server/trpc/middlewares/rate-limit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { requireSessionMiddleware } from "@/lib/server/trpc/middlewares/require-session";

export const protectedProcedure = publicProcedure.use(requireSessionMiddleware);

export const adminProcedure = protectedProcedure.use(requireRoleMiddleware([USER_ROLES.ADMIN]));

export const editorialProcedure = protectedProcedure.use(
  requireRoleMiddleware([USER_ROLES.ADMIN, USER_ROLES.EDITOR]),
);

export const adminWriteProcedure = adminProcedure.use(
  rateLimitMiddleware(rateLimitPolicies.sensitiveWrite),
);

export const editorialWriteProcedure = editorialProcedure.use(
  rateLimitMiddleware(rateLimitPolicies.write),
);

export const editorialPublishProcedure = editorialProcedure.use(
  rateLimitMiddleware(rateLimitPolicies.publish),
);

export const editorialReorderProcedure = editorialProcedure.use(
  rateLimitMiddleware(rateLimitPolicies.reorder),
);
