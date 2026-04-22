import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { ok } from "@/lib/server/http/api-response";
import { getIdParam } from "@/lib/server/http/params";
import { withRoute } from "@/lib/server/http/route";
import { articlesService } from "@/lib/server/modules/articles";
import { syncArticleTagsInputSchema } from "@/lib/server/modules/articles/schema";
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
    const id = await getIdParam(context.params);
    const input = await parseJsonBody(request, syncArticleTagsInputSchema);
    const data = await articlesService.syncTags(id, input);

    return ok(data);
  });
}
