import "server-only";

import { z } from "zod";

import {
  categoriesListDtoSchema,
  categoriesPolicy,
  categoriesService,
  categoryDetailDtoSchema,
  categoryDtoSchema,
  createCategoryInputSchema,
  listCategoriesQuerySchema,
  updateCategoryInputSchema,
} from "@/lib/server/modules/categories";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure, writeProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const categoryIdInputSchema = z.object({
  id: z.string().uuid(),
});

const categoriesListInputSchema = paginationInputSchema.extend({
  query: listCategoriesQuerySchema.default({
    sortBy: "createdAt",
    sortOrder: "desc",
  }),
});

export const categoriesRouter = router({
  list: protectedProcedure
    .use(requireRoleMiddleware(categoriesPolicy.allowedRoles))
    .input(categoriesListInputSchema)
    .query(async ({ input }) => {
      const result = await categoriesService.list(input.query, {
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
  getById: protectedProcedure
    .use(requireRoleMiddleware(categoriesPolicy.allowedRoles))
    .input(categoryIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(await categoriesService.getById(input.id), categoryDetailDtoSchema);
    }),
  create: writeProcedure
    .use(requireRoleMiddleware(categoriesPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "create", resource: "categories" })))
    .input(createCategoryInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await categoriesService.create(input), categoryDtoSchema);
    }),
  update: writeProcedure
    .use(requireRoleMiddleware(categoriesPolicy.allowedRoles))
    .input(categoryIdInputSchema.extend({ data: updateCategoryInputSchema }))
    .use(
      auditMiddleware<{ id: string; data: z.infer<typeof updateCategoryInputSchema> }>((input) => ({
        action: "update",
        resource: "categories",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      return parseOutput(await categoriesService.update(input.id, input.data), categoryDtoSchema);
    }),
  delete: writeProcedure
    .use(requireRoleMiddleware(categoriesPolicy.allowedRoles))
    .input(categoryIdInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "delete",
        resource: "categories",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      await categoriesService.delete(input.id);
      return { success: true };
    }),
});
