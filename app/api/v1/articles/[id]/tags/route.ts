import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { ok } from "@/lib/server/http/api-response";
import { auditAction } from "@/lib/server/http/audit";
import { getIdParam } from "@/lib/server/http/params";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/server/http/rate-limit";
import { withRoute } from "@/lib/server/http/route";
import {
  articleDtoSchema,
  articlesService,
  syncArticleTagsInputSchema,
} from "@/lib/server/modules/articles";
import { parseOutput } from "@/lib/server/validation/output";
import { parseJsonBody } from "@/lib/server/validation/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITORIAL_ROLES = [USER_ROLES.ADMIN, USER_ROLES.EDITOR];

type RouteParams = {
  params: Promise<unknown>;
};

export async function PUT(request: Request, context: RouteParams) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    enforceRateLimit(request, rateLimitPolicies.write);
    const id = await getIdParam(context.params);
    await auditAction(request, { action: "sync-tags", resource: "articles", resourceId: id });
    const input = await parseJsonBody(request, syncArticleTagsInputSchema);
    const data = parseOutput(await articlesService.syncTags(id, input), articleDtoSchema);

    return ok(data);
  });
}
