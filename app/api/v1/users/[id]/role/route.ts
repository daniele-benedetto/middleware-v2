import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { ok } from "@/lib/server/http/api-response";
import { auditAction } from "@/lib/server/http/audit";
import { getIdParam } from "@/lib/server/http/params";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/server/http/rate-limit";
import { withRoute } from "@/lib/server/http/route";
import {
  updateUserRoleInputSchema,
  userListItemDtoSchema,
  usersService,
} from "@/lib/server/modules/users";
import { parseOutput } from "@/lib/server/validation/output";
import { parseJsonBody } from "@/lib/server/validation/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<unknown>;
};

export async function PATCH(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, [USER_ROLES.ADMIN]);
    enforceRateLimit(request, rateLimitPolicies.sensitiveWrite);
    const id = await getIdParam(context.params);
    await auditAction(request, { action: "assign-role", resource: "users", resourceId: id });
    const input = await parseJsonBody(request, updateUserRoleInputSchema);
    const data = parseOutput(await usersService.updateRole(id, input), userListItemDtoSchema);

    return ok(data);
  });
}
