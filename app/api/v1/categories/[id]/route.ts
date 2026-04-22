import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { noContent, ok } from "@/lib/server/http/api-response";
import { getIdParam } from "@/lib/server/http/params";
import { withRoute } from "@/lib/server/http/route";
import { categoriesService } from "@/lib/server/modules/categories";

import type { UpdateCategoryInput } from "@/lib/server/modules/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITORIAL_ROLES = [USER_ROLES.ADMIN, USER_ROLES.EDITOR];

type RouteParams = {
  params: Promise<unknown>;
};

export async function GET(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    const id = await getIdParam(context.params);
    const data = await categoriesService.getById(id);

    return ok(data);
  });
}

export async function PATCH(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    const id = await getIdParam(context.params);
    const input = (await request.json()) as UpdateCategoryInput;
    const data = await categoriesService.update(id, input);

    return ok(data);
  });
}

export async function DELETE(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    const id = await getIdParam(context.params);
    await categoriesService.hardDelete(id);

    return noContent();
  });
}
