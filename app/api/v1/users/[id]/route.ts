import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { noContent, ok } from "@/lib/server/http/api-response";
import { auditAction } from "@/lib/server/http/audit";
import { getIdParam } from "@/lib/server/http/params";
import { withRoute } from "@/lib/server/http/route";
import {
  updateUserInputSchema,
  userDetailDtoSchema,
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

export async function GET(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, [USER_ROLES.ADMIN]);
    const id = await getIdParam(context.params);
    const data = parseOutput(await usersService.getById(id), userDetailDtoSchema);

    return ok(data);
  });
}

export async function PATCH(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, [USER_ROLES.ADMIN]);
    const id = await getIdParam(context.params);
    await auditAction(request, { action: "update", resource: "users", resourceId: id });
    const input = await parseJsonBody(request, updateUserInputSchema);
    const data = parseOutput(await usersService.update(id, input), userListItemDtoSchema);

    return ok(data);
  });
}

export async function DELETE(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, [USER_ROLES.ADMIN]);
    const id = await getIdParam(context.params);
    await auditAction(request, { action: "delete", resource: "users", resourceId: id });
    await usersService.hardDelete(id);

    return noContent();
  });
}
