import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { created, ok } from "@/lib/server/http/api-response";
import { auditAction } from "@/lib/server/http/audit";
import { parsePagination } from "@/lib/server/http/pagination";
import { withRoute } from "@/lib/server/http/route";
import {
  createUserInputSchema,
  userListDtoSchema,
  userListItemDtoSchema,
  usersService,
} from "@/lib/server/modules/users";
import { parseOutput } from "@/lib/server/validation/output";
import { parseJsonBody } from "@/lib/server/validation/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withRoute(async () => {
    await requireRole(request, [USER_ROLES.ADMIN]);
    const pagination = parsePagination(new URL(request.url).searchParams);
    const data = parseOutput(await usersService.list(), userListDtoSchema);

    return ok(data, {
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: 0,
      },
    });
  });
}

export async function POST(request: Request) {
  return withRoute(async () => {
    await requireRole(request, [USER_ROLES.ADMIN]);
    await auditAction(request, { action: "create", resource: "users" });
    const input = await parseJsonBody(request, createUserInputSchema);
    const data = parseOutput(await usersService.create(input), userListItemDtoSchema);

    return created(data);
  });
}
