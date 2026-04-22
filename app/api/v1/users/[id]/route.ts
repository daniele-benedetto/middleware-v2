import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { noContent, ok } from "@/lib/server/http/api-response";
import { getIdParam } from "@/lib/server/http/params";
import { withRoute } from "@/lib/server/http/route";
import { usersService } from "@/lib/server/modules/users";
import { updateUserInputSchema } from "@/lib/server/modules/users/schema";
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
    const data = await usersService.getById(id);

    return ok(data);
  });
}

export async function PATCH(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, [USER_ROLES.ADMIN]);
    const id = await getIdParam(context.params);
    const input = await parseJsonBody(request, updateUserInputSchema);
    const data = await usersService.update(id, input);

    return ok(data);
  });
}

export async function DELETE(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, [USER_ROLES.ADMIN]);
    const id = await getIdParam(context.params);
    await usersService.hardDelete(id);

    return noContent();
  });
}
