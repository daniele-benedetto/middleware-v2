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
  query: listTagsQuerySchema.optional(),
});

export const tagsRouter = router({
  list: protectedProcedure
    .use(requireRoleMiddleware(tagsPolicy.allowedRoles))
    .input(tagsListInputSchema)
    .query(async ({ input }) => {
      const query = listTagsQuerySchema.parse(input.query ?? {});
      const result = await tagsService.list(query, {
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
    .use(
      auditMiddleware<{ id: string; data: z.infer<typeof updateTagInputSchema> }>((input) => ({
        action: "update",
        resource: "tags",
        resourceId: input.id,
      })),
    )
    .input(tagIdInputSchema.extend({ data: updateTagInputSchema }))
    .mutation(async ({ input }) => {
      return parseOutput(await tagsService.update(input.id, input.data), tagDtoSchema);
    }),
  delete: writeProcedure
    .use(requireRoleMiddleware(tagsPolicy.allowedRoles))
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "delete",
        resource: "tags",
        resourceId: input.id,
      })),
    )
    .input(tagIdInputSchema)
    .mutation(async ({ input }) => {
      await tagsService.hardDelete(input.id);
      return { success: true };
    }),
});
