import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { created, ok } from "@/lib/server/http/api-response";
import { parsePagination } from "@/lib/server/http/pagination";
import { withRoute } from "@/lib/server/http/route";
import { articlesService } from "@/lib/server/modules/articles";

import type { CreateArticleInput } from "@/lib/server/modules/articles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITORIAL_ROLES = [USER_ROLES.ADMIN, USER_ROLES.EDITOR];

export async function GET(request: Request) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    const pagination = parsePagination(new URL(request.url).searchParams);
    const data = await articlesService.list();

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
    await requireRole(request, EDITORIAL_ROLES);
    const input = (await request.json()) as CreateArticleInput;
    const data = await articlesService.create(input);

    return created(data);
  });
}
