import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { ok } from "@/lib/server/http/api-response";
import { withRoute } from "@/lib/server/http/route";
import {
  articleDtoSchema,
  articlesService,
  reorderArticlesInputSchema,
} from "@/lib/server/modules/articles";
import { parseOutput } from "@/lib/server/validation/output";
import { parseJsonBody } from "@/lib/server/validation/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITORIAL_ROLES = [USER_ROLES.ADMIN, USER_ROLES.EDITOR];

export async function POST(request: Request) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    const input = await parseJsonBody(request, reorderArticlesInputSchema);
    const data = parseOutput(await articlesService.reorder(input), articleDtoSchema);

    return ok(data);
  });
}
