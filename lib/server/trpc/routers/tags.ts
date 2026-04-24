import "server-only";

import { z } from "zod";

import {
  createTagInputSchema,
  listTagsQuerySchema,
  tagDtoSchema,
  tagsListDtoSchema,
  tagsPolicy,
  tagsService,
  updateTagInputSchema,
} from "@/lib/server/modules/tags";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure, writeProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const tagIdInputSchema = z.object({
  id: z.string().uuid(),
});

const tagsListInputSchema = paginationInputSchema.extend({
  query: listTagsQuerySchema.default({
    sortBy: "createdAt",
    sortOrder: "desc",
  }),
});

export const tagsRouter = router({
  list: protectedProcedure
    .use(requireRoleMiddleware(tagsPolicy.allowedRoles))
    .input(tagsListInputSchema)
    .query(async ({ input }) => {
      const result = await tagsService.list(input.query, {
        page: input.page,
        pageSize: input.pageSize,
      });

      return {
        items: parseOutput(result.items, tagsListDtoSchema),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: result.total,
        },
      };
    }),
  getById: protectedProcedure
    .use(requireRoleMiddleware(tagsPolicy.allowedRoles))
    .input(tagIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(await tagsService.getById(input.id), tagDtoSchema);
    }),
  create: writeProcedure
    .use(requireRoleMiddleware(tagsPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "create", resource: "tags" })))
    .input(createTagInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await tagsService.create(input), tagDtoSchema);
    }),
  update: writeProcedure
    .use(requireRoleMiddleware(tagsPolicy.allowedRoles))
    .input(tagIdInputSchema.extend({ data: updateTagInputSchema }))
    .use(
      auditMiddleware<{ id: string; data: z.infer<typeof updateTagInputSchema> }>((input) => ({
        action: "update",
        resource: "tags",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      return parseOutput(await tagsService.update(input.id, input.data), tagDtoSchema);
    }),
  delete: writeProcedure
    .use(requireRoleMiddleware(tagsPolicy.allowedRoles))
    .input(tagIdInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "delete",
        resource: "tags",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      await tagsService.delete(input.id);
      return { success: true };
    }),
});
