import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { ok } from "@/lib/server/http/api-response";
import { getIdParam } from "@/lib/server/http/params";
import { withRoute } from "@/lib/server/http/route";
import { usersService } from "@/lib/server/modules/users";

import type { UpdateUserRoleInput } from "@/lib/server/modules/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<unknown>;
};

export async function PATCH(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, [USER_ROLES.ADMIN]);
    const id = await getIdParam(context.params);
    const input = (await request.json()) as UpdateUserRoleInput;
    const data = await usersService.updateRole(id, input);

    return ok(data);
  });
}
