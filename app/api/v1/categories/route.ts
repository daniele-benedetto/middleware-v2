import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { created, ok } from "@/lib/server/http/api-response";
import { parsePagination } from "@/lib/server/http/pagination";
import { withRoute } from "@/lib/server/http/route";
import {
  categoriesListDtoSchema,
  categoriesService,
  categoryDtoSchema,
  createCategoryInputSchema,
} from "@/lib/server/modules/categories";
import { parseOutput } from "@/lib/server/validation/output";
import { parseJsonBody } from "@/lib/server/validation/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITORIAL_ROLES = [USER_ROLES.ADMIN, USER_ROLES.EDITOR];

export async function GET(request: Request) {
  return withRoute(async () => {
    await requireRole(request, EDITORIAL_ROLES);
    const pagination = parsePagination(new URL(request.url).searchParams);
    const data = parseOutput(await categoriesService.list(), categoriesListDtoSchema);

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
    const input = await parseJsonBody(request, createCategoryInputSchema);
    const data = parseOutput(await categoriesService.create(input), categoryDtoSchema);

    return created(data);
  });
}
