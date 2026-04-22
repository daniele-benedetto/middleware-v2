import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { noContent, ok } from "@/lib/server/http/api-response";
import { auditAction } from "@/lib/server/http/audit";
import { getIdParam } from "@/lib/server/http/params";
import { withRoute } from "@/lib/server/http/route";
import {
  categoriesService,
  categoryDtoSchema,
  updateCategoryInputSchema,
} from "@/lib/server/modules/categories";
import { parseOutput } from "@/lib/server/validation/output";
import { parseJsonBody } from "@/lib/server/validation/parse";

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
    const data = parseOutput(await categoriesService.getById(id), categoryDtoSchema);

    return ok(data);
  });
}

export async function PATCH(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    const id = await getIdParam(context.params);
    await auditAction(request, { action: "update", resource: "categories", resourceId: id });
    const input = await parseJsonBody(request, updateCategoryInputSchema);
    const data = parseOutput(await categoriesService.update(id, input), categoryDtoSchema);

    return ok(data);
  });
}

export async function DELETE(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    const id = await getIdParam(context.params);
    await auditAction(request, { action: "delete", resource: "categories", resourceId: id });
    await categoriesService.hardDelete(id);

    return noContent();
  });
}
