import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { created, ok } from "@/lib/server/http/api-response";
import { auditAction } from "@/lib/server/http/audit";
import { parsePagination } from "@/lib/server/http/pagination";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/server/http/rate-limit";
import { withRoute } from "@/lib/server/http/route";
import {
  createTagInputSchema,
  listTagsQuerySchema,
  tagDtoSchema,
  tagsListDtoSchema,
  tagsService,
} from "@/lib/server/modules/tags";
import { parseOutput } from "@/lib/server/validation/output";
import { parseJsonBody, parseWithZod } from "@/lib/server/validation/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITORIAL_ROLES = [USER_ROLES.ADMIN, USER_ROLES.EDITOR];

export async function GET(request: Request) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    const searchParams = new URL(request.url).searchParams;
    const pagination = parsePagination(searchParams);
    const query = parseWithZod(
      {
        isActive: searchParams.get("isActive") ?? undefined,
        q: searchParams.get("q") ?? undefined,
        sortBy: searchParams.get("sortBy") ?? undefined,
        sortOrder: searchParams.get("sortOrder") ?? undefined,
      },
      listTagsQuerySchema,
    );
    const result = await tagsService.list(query, pagination);
    const data = parseOutput(result.items, tagsListDtoSchema);

    return ok(data, {
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: result.total,
      },
    });
  });
}

export async function POST(request: Request) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    enforceRateLimit(request, rateLimitPolicies.write);
    await auditAction(request, { action: "create", resource: "tags" });
    const input = await parseJsonBody(request, createTagInputSchema);
    const data = parseOutput(await tagsService.create(input), tagDtoSchema);

    return created(data);
  });
}
