import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { created, ok } from "@/lib/server/http/api-response";
import { parsePagination } from "@/lib/server/http/pagination";
import { withRoute } from "@/lib/server/http/route";
import { usersService } from "@/lib/server/modules/users";
import { createUserInputSchema } from "@/lib/server/modules/users/schema";
import { parseJsonBody } from "@/lib/server/validation/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withRoute(async () => {
    await requireRole(request, [USER_ROLES.ADMIN]);
    const pagination = parsePagination(new URL(request.url).searchParams);
    const data = await usersService.list();

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
    const input = await parseJsonBody(request, createUserInputSchema);
    const data = await usersService.create(input);

    return created(data);
  });
}
