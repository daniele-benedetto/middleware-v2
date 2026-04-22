import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { noContent, ok } from "@/lib/server/http/api-response";
import { auditAction } from "@/lib/server/http/audit";
import { getIdParam } from "@/lib/server/http/params";
import { withRoute } from "@/lib/server/http/route";
import {
  articleDtoSchema,
  articlesService,
  updateArticleInputSchema,
} from "@/lib/server/modules/articles";
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
    const data = parseOutput(await articlesService.getById(id), articleDtoSchema);

    return ok(data);
  });
}

export async function PATCH(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    const id = await getIdParam(context.params);
    await auditAction(request, { action: "update", resource: "articles", resourceId: id });
    const input = await parseJsonBody(request, updateArticleInputSchema);
    const data = parseOutput(await articlesService.update(id, input), articleDtoSchema);

    return ok(data);
  });
}

export async function DELETE(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    const id = await getIdParam(context.params);
    await auditAction(request, { action: "delete", resource: "articles", resourceId: id });
    await articlesService.hardDelete(id);

    return noContent();
  });
}
