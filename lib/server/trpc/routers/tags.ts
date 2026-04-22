import { z } from "zod";

import {
  createTagInputSchema,
  listTagsQuerySchema,
  tagDtoSchema,
  tagsListDtoSchema,
  tagsService,
  updateTagInputSchema,
} from "@/lib/server/modules/tags";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { editorialProcedure, editorialWriteProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const tagIdInputSchema = z.object({
  id: z.string().uuid(),
});

const tagsListInputSchema = paginationInputSchema.extend({
  query: listTagsQuerySchema.optional(),
});

export const tagsRouter = router({
  list: editorialProcedure.input(tagsListInputSchema).query(async ({ input }) => {
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
  getById: editorialProcedure.input(tagIdInputSchema).query(async ({ input }) => {
    return parseOutput(await tagsService.getById(input.id), tagDtoSchema);
  }),
  create: editorialWriteProcedure
    .use(auditMiddleware(() => ({ action: "create", resource: "tags" })))
    .input(createTagInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await tagsService.create(input), tagDtoSchema);
    }),
  update: editorialWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "update",
        resource: "tags",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(tagIdInputSchema.extend({ data: updateTagInputSchema }))
    .mutation(async ({ input }) => {
      return parseOutput(await tagsService.update(input.id, input.data), tagDtoSchema);
    }),
  delete: editorialWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "delete",
        resource: "tags",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(tagIdInputSchema)
    .mutation(async ({ input }) => {
      await tagsService.hardDelete(input.id);
      return { success: true };
    }),
});
