import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { created, ok } from "@/lib/server/http/api-response";
import { auditAction } from "@/lib/server/http/audit";
import { parsePagination } from "@/lib/server/http/pagination";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/server/http/rate-limit";
import { withRoute } from "@/lib/server/http/route";
import {
  categoriesListDtoSchema,
  categoriesService,
  categoryDtoSchema,
  createCategoryInputSchema,
  listCategoriesQuerySchema,
} from "@/lib/server/modules/categories";
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
      listCategoriesQuerySchema,
    );
    const result = await categoriesService.list(query, pagination);
    const data = parseOutput(result.items, categoriesListDtoSchema);

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
    await auditAction(request, { action: "create", resource: "categories" });
    const input = await parseJsonBody(request, createCategoryInputSchema);
    const data = parseOutput(await categoriesService.create(input), categoryDtoSchema);

    return created(data);
  });
}
