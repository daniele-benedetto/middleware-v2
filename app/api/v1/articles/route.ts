import { requireRole } from "@/lib/server/auth/guards";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { created, ok } from "@/lib/server/http/api-response";
import { auditAction } from "@/lib/server/http/audit";
import { parsePagination } from "@/lib/server/http/pagination";
import { withRoute } from "@/lib/server/http/route";
import {
  articleDtoSchema,
  articlesListDtoSchema,
  articlesService,
  createArticleInputSchema,
  listArticlesQuerySchema,
} from "@/lib/server/modules/articles";
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
        status: searchParams.get("status") ?? undefined,
        issueId: searchParams.get("issueId") ?? undefined,
        categoryId: searchParams.get("categoryId") ?? undefined,
        featured: searchParams.get("featured") ?? undefined,
        q: searchParams.get("q") ?? undefined,
      },
      listArticlesQuerySchema,
    );
    const result = await articlesService.list(query, pagination);
    const data = parseOutput(result.items, articlesListDtoSchema);

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
    await auditAction(request, { action: "create", resource: "articles" });
    const input = await parseJsonBody(request, createArticleInputSchema);
    const data = parseOutput(await articlesService.create(input), articleDtoSchema);

    return created(data);
  });
}
