import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { noContent, ok } from "@/lib/server/http/api-response";
import { auditAction } from "@/lib/server/http/audit";
import { getIdParam } from "@/lib/server/http/params";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/server/http/rate-limit";
import { withRoute } from "@/lib/server/http/route";
import { tagDtoSchema, tagsService, updateTagInputSchema } from "@/lib/server/modules/tags";
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
    const data = parseOutput(await tagsService.getById(id), tagDtoSchema);

    return ok(data);
  });
}

export async function PATCH(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    enforceRateLimit(request, rateLimitPolicies.write);
    const id = await getIdParam(context.params);
    await auditAction(request, { action: "update", resource: "tags", resourceId: id });
    const input = await parseJsonBody(request, updateTagInputSchema);
    const data = parseOutput(await tagsService.update(id, input), tagDtoSchema);

    return ok(data);
  });
}

export async function DELETE(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    enforceRateLimit(request, rateLimitPolicies.write);
    const id = await getIdParam(context.params);
    await auditAction(request, { action: "delete", resource: "tags", resourceId: id });
    await tagsService.hardDelete(id);

    return noContent();
  });
}
