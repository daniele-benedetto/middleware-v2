import { z } from "zod";

import {
  createIssueInputSchema,
  issueDtoSchema,
  issuesListDtoSchema,
  issuesService,
  listIssuesQuerySchema,
  updateIssueInputSchema,
} from "@/lib/server/modules/issues";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { editorialProcedure, editorialWriteProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const issueIdInputSchema = z.object({
  id: z.string().uuid(),
});

const issuesListInputSchema = paginationInputSchema.extend({
  query: listIssuesQuerySchema.optional(),
});

export const issuesRouter = router({
  list: editorialProcedure.input(issuesListInputSchema).query(async ({ input }) => {
    const query = listIssuesQuerySchema.parse(input.query ?? {});
    const result = await issuesService.list(query, {
      page: input.page,
      pageSize: input.pageSize,
    });

    return {
      items: parseOutput(result.items, issuesListDtoSchema),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
      },
    };
  }),
  getById: editorialProcedure.input(issueIdInputSchema).query(async ({ input }) => {
    return parseOutput(await issuesService.getById(input.id), issueDtoSchema);
  }),
  create: editorialWriteProcedure
    .use(auditMiddleware(() => ({ action: "create", resource: "issues" })))
    .input(createIssueInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await issuesService.create(input), issueDtoSchema);
    }),
  update: editorialWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "update",
        resource: "issues",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(issueIdInputSchema.extend({ data: updateIssueInputSchema }))
    .mutation(async ({ input }) => {
      return parseOutput(await issuesService.update(input.id, input.data), issueDtoSchema);
    }),
  delete: editorialWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "delete",
        resource: "issues",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(issueIdInputSchema)
    .mutation(async ({ input }) => {
      await issuesService.hardDelete(input.id);
      return { success: true };
    }),
});
