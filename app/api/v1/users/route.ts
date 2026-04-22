import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { created, ok } from "@/lib/server/http/api-response";
import { auditAction } from "@/lib/server/http/audit";
import { parsePagination } from "@/lib/server/http/pagination";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/server/http/rate-limit";
import { withRoute } from "@/lib/server/http/route";
import {
  createUserInputSchema,
  listUsersQuerySchema,
  userListDtoSchema,
  userListItemDtoSchema,
  usersService,
} from "@/lib/server/modules/users";
import { parseOutput } from "@/lib/server/validation/output";
import { parseJsonBody, parseWithZod } from "@/lib/server/validation/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withRoute(async () => {
    await requireRole(request, [USER_ROLES.ADMIN]);
    const searchParams = new URL(request.url).searchParams;
    const pagination = parsePagination(searchParams);
    const query = parseWithZod(
      {
        role: searchParams.get("role") ?? undefined,
        q: searchParams.get("q") ?? undefined,
        sortBy: searchParams.get("sortBy") ?? undefined,
        sortOrder: searchParams.get("sortOrder") ?? undefined,
      },
      listUsersQuerySchema,
    );
    const result = await usersService.list(query, pagination);
    const data = parseOutput(result.items, userListDtoSchema);

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
    await requireRole(request, [USER_ROLES.ADMIN]);
    enforceRateLimit(request, rateLimitPolicies.sensitiveWrite);
    await auditAction(request, { action: "create", resource: "users" });
    const input = await parseJsonBody(request, createUserInputSchema);
    const data = parseOutput(await usersService.create(input), userListItemDtoSchema);

    return created(data);
  });
}
