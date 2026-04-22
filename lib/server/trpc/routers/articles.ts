import { z } from "zod";

import {
  articleDtoSchema,
  articlesListDtoSchema,
  articlesService,
  createArticleInputSchema,
  listArticlesQuerySchema,
  reorderArticlesInputSchema,
  syncArticleTagsInputSchema,
  updateArticleInputSchema,
} from "@/lib/server/modules/articles";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import {
  editorialProcedure,
  editorialPublishProcedure,
  editorialReorderProcedure,
  editorialWriteProcedure,
} from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const articleIdInputSchema = z.object({
  id: z.string().uuid(),
});

const articlesListInputSchema = paginationInputSchema.extend({
  query: listArticlesQuerySchema.optional(),
});

export const articlesRouter = router({
  list: editorialProcedure.input(articlesListInputSchema).query(async ({ input }) => {
    const query = listArticlesQuerySchema.parse(input.query ?? {});
    const result = await articlesService.list(query, {
      page: input.page,
      pageSize: input.pageSize,
    });

    return {
      items: parseOutput(result.items, articlesListDtoSchema),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
      },
    };
  }),
  getById: editorialProcedure.input(articleIdInputSchema).query(async ({ input }) => {
    return parseOutput(await articlesService.getById(input.id), articleDtoSchema);
  }),
  create: editorialWriteProcedure
    .use(auditMiddleware(() => ({ action: "create", resource: "articles" })))
    .input(createArticleInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await articlesService.create(input), articleDtoSchema);
    }),
  update: editorialWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "update",
        resource: "articles",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(articleIdInputSchema.extend({ data: updateArticleInputSchema }))
    .mutation(async ({ input }) => {
      return parseOutput(await articlesService.update(input.id, input.data), articleDtoSchema);
    }),
  delete: editorialWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "delete",
        resource: "articles",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(articleIdInputSchema)
    .mutation(async ({ input }) => {
      await articlesService.hardDelete(input.id);
      return { success: true };
    }),
  syncTags: editorialWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "sync-tags",
        resource: "articles",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(articleIdInputSchema.extend({ data: syncArticleTagsInputSchema }))
    .mutation(async ({ input }) => {
      return parseOutput(await articlesService.syncTags(input.id, input.data), articleDtoSchema);
    }),
  publish: editorialPublishProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "publish",
        resource: "articles",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(articleIdInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await articlesService.publish(input.id), articleDtoSchema);
    }),
  unpublish: editorialWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "unpublish",
        resource: "articles",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(articleIdInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await articlesService.unpublish(input.id), articleDtoSchema);
    }),
  archive: editorialWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "archive",
        resource: "articles",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(articleIdInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await articlesService.archive(input.id), articleDtoSchema);
    }),
  feature: editorialWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "feature",
        resource: "articles",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(articleIdInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await articlesService.feature(input.id), articleDtoSchema);
    }),
  unfeature: editorialWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "unfeature",
        resource: "articles",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(articleIdInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await articlesService.unfeature(input.id), articleDtoSchema);
    }),
  reorder: editorialReorderProcedure
    .use(auditMiddleware(() => ({ action: "reorder", resource: "articles" })))
    .input(reorderArticlesInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await articlesService.reorder(input), articleDtoSchema);
    }),
});
