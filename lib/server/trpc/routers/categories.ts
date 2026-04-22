import { z } from "zod";

import {
  categoriesListDtoSchema,
  categoriesService,
  categoryDtoSchema,
  createCategoryInputSchema,
  listCategoriesQuerySchema,
  updateCategoryInputSchema,
} from "@/lib/server/modules/categories";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { editorialProcedure, editorialWriteProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const categoryIdInputSchema = z.object({
  id: z.string().uuid(),
});

const categoriesListInputSchema = paginationInputSchema.extend({
  query: listCategoriesQuerySchema.optional(),
});

export const categoriesRouter = router({
  list: editorialProcedure.input(categoriesListInputSchema).query(async ({ input }) => {
    const query = listCategoriesQuerySchema.parse(input.query ?? {});
    const result = await categoriesService.list(query, {
      page: input.page,
      pageSize: input.pageSize,
    });

    return {
      items: parseOutput(result.items, categoriesListDtoSchema),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
      },
    };
  }),
  getById: editorialProcedure.input(categoryIdInputSchema).query(async ({ input }) => {
    return parseOutput(await categoriesService.getById(input.id), categoryDtoSchema);
  }),
  create: editorialWriteProcedure
    .use(auditMiddleware(() => ({ action: "create", resource: "categories" })))
    .input(createCategoryInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await categoriesService.create(input), categoryDtoSchema);
    }),
  update: editorialWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "update",
        resource: "categories",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(categoryIdInputSchema.extend({ data: updateCategoryInputSchema }))
    .mutation(async ({ input }) => {
      return parseOutput(await categoriesService.update(input.id, input.data), categoryDtoSchema);
    }),
  delete: editorialWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "delete",
        resource: "categories",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(categoryIdInputSchema)
    .mutation(async ({ input }) => {
      await categoriesService.hardDelete(input.id);
      return { success: true };
    }),
});
