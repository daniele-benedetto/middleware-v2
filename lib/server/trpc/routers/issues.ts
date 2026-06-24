import "server-only";

import { z } from "zod";

import { revalidatePublicIssueContent } from "@/lib/public/server/revalidation";
import {
  createIssueInputSchema,
  issueDetailDtoSchema,
  issueDtoSchema,
  issuesListDtoSchema,
  issuesPolicy,
  issuesService,
  listIssuesQuerySchema,
  reorderIssuesInputSchema,
  updateIssueInputSchema,
} from "@/lib/server/modules/issues";
import { publicIssueDetailDtoSchema } from "@/lib/server/modules/issues/dto/public";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure, reorderProcedure, writeProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const issueIdInputSchema = z.object({
  id: z.string().uuid(),
});

const issuesListInputSchema = paginationInputSchema.extend({
  query: listIssuesQuerySchema.default({
    sortBy: "sortOrder",
    sortOrder: "asc",
  }),
});

export const issuesRouter = router({
  list: protectedProcedure
    .use(requireRoleMiddleware(issuesPolicy.allowedRoles))
    .input(issuesListInputSchema)
    .query(async ({ input }) => {
      const result = await issuesService.list(input.query, {
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
  getById: protectedProcedure
    .use(requireRoleMiddleware(issuesPolicy.allowedRoles))
    .input(issueIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(await issuesService.getById(input.id), issueDetailDtoSchema);
    }),
  getPreviewById: protectedProcedure
    .use(requireRoleMiddleware(issuesPolicy.allowedRoles))
    .input(issueIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(await issuesService.getPreviewById(input.id), publicIssueDetailDtoSchema);
    }),
  create: writeProcedure
    .use(requireRoleMiddleware(issuesPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "create", resource: "issues" })))
    .input(createIssueInputSchema)
    .mutation(async ({ input }) => {
      const issue = parseOutput(await issuesService.create(input), issueDtoSchema);
      revalidatePublicIssueContent();
      return issue;
    }),
  update: writeProcedure
    .use(requireRoleMiddleware(issuesPolicy.allowedRoles))
    .input(
      issueIdInputSchema.extend({
        data: updateIssueInputSchema,
      }),
    )
    .use(
      auditMiddleware<{
        id: string;
        data: z.infer<typeof updateIssueInputSchema>;
      }>((input) => ({
        action: "update",
        resource: "issues",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const issue = parseOutput(await issuesService.update(input.id, input.data), issueDtoSchema);
      revalidatePublicIssueContent();
      return issue;
    }),
  delete: writeProcedure
    .use(requireRoleMiddleware(issuesPolicy.allowedRoles))
    .input(issueIdInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "delete",
        resource: "issues",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      await issuesService.delete(input.id);
      revalidatePublicIssueContent();
      return { success: true };
    }),
  reorder: reorderProcedure
    .use(requireRoleMiddleware(issuesPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "reorder", resource: "issues" })))
    .input(reorderIssuesInputSchema)
    .mutation(async ({ input }) => {
      const issues = parseOutput(await issuesService.reorder(input), issuesListDtoSchema);
      revalidatePublicIssueContent();
      return issues;
    }),
});
