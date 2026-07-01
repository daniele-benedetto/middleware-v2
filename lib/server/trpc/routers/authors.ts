import "server-only";

import { z } from "zod";

import {
  authorDetailDtoSchema,
  authorDtoSchema,
  authorsListDtoSchema,
  authorsPolicy,
  authorsService,
  createAuthorInputSchema,
  listAuthorsQuerySchema,
  updateAuthorInputSchema,
} from "@/lib/server/modules/authors";
import { router } from "@/lib/server/trpc/init";
import { auditResourceMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure, writeProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { successOutputSchema } from "@/lib/server/trpc/schemas/result";
import { parseOutput } from "@/lib/server/validation/output";

const authorIdInputSchema = z.object({
  id: z.string().uuid(),
});

const authorsListInputSchema = paginationInputSchema.extend({
  query: listAuthorsQuerySchema.default({
    sortBy: "createdAt",
    sortOrder: "desc",
  }),
});

export const authorsRouter = router({
  list: protectedProcedure
    .use(requireRoleMiddleware(authorsPolicy.allowedRoles))
    .input(authorsListInputSchema)
    .query(async ({ input }) => {
      const result = await authorsService.list(input.query, {
        page: input.page,
        pageSize: input.pageSize,
      });

      return {
        items: parseOutput(result.items, authorsListDtoSchema),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: result.total,
        },
      };
    }),
  getById: protectedProcedure
    .use(requireRoleMiddleware(authorsPolicy.allowedRoles))
    .input(authorIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(await authorsService.getById(input.id), authorDetailDtoSchema);
    }),
  create: writeProcedure
    .use(requireRoleMiddleware(authorsPolicy.allowedRoles))
    .use(auditResourceMiddleware(() => ({ action: "create", resourceType: "author" })))
    .input(createAuthorInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await authorsService.create(input), authorDtoSchema);
    }),
  update: writeProcedure
    .use(requireRoleMiddleware(authorsPolicy.allowedRoles))
    .input(authorIdInputSchema.extend({ data: updateAuthorInputSchema }))
    .use(
      auditResourceMiddleware<{ id: string; data: z.infer<typeof updateAuthorInputSchema> }>(
        (input) => ({
          action: "update",
          resourceType: "author",
          resourceId: input.id,
        }),
      ),
    )
    .mutation(async ({ input }) => {
      return parseOutput(await authorsService.update(input.id, input.data), authorDtoSchema);
    }),
  delete: writeProcedure
    .use(requireRoleMiddleware(authorsPolicy.allowedRoles))
    .input(authorIdInputSchema)
    .use(
      auditResourceMiddleware<{ id: string }>((input) => ({
        action: "delete",
        resourceType: "author",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      await authorsService.delete(input.id);
      return parseOutput({ success: true }, successOutputSchema);
    }),
});
