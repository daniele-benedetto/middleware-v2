import "server-only";

import { z } from "zod";

import { revalidatePublicArticleContent } from "@/lib/public/server/revalidation";
import {
  articleDetailDtoSchema,
  articleDtoSchema,
  articlesListDtoSchema,
  articlesPolicy,
  articlesService,
  createArticleInputSchema,
  listArticlesQuerySchema,
  syncArticleTagsInputSchema,
  updateArticleInputSchema,
} from "@/lib/server/modules/articles";
import { publicArticleDetailDtoSchema } from "@/lib/server/modules/articles/dto/public";
import { router } from "@/lib/server/trpc/init";
import { auditResourceMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure, publishProcedure, writeProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { successOutputSchema } from "@/lib/server/trpc/schemas/result";
import { parseOutput } from "@/lib/server/validation/output";

const articleIdInputSchema = z.object({
  id: z.string().uuid(),
});

const articlesListInputSchema = paginationInputSchema.extend({
  query: listArticlesQuerySchema.default({
    sortBy: "createdAt",
    sortOrder: "desc",
  }),
});

export const articlesRouter = router({
  list: protectedProcedure
    .use(requireRoleMiddleware(articlesPolicy.allowedRoles))
    .input(articlesListInputSchema)
    .query(async ({ input }) => {
      const result = await articlesService.list(input.query, {
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
  getById: protectedProcedure
    .use(requireRoleMiddleware(articlesPolicy.allowedRoles))
    .input(articleIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(await articlesService.getById(input.id), articleDetailDtoSchema);
    }),
  getPreviewById: protectedProcedure
    .use(requireRoleMiddleware(articlesPolicy.allowedRoles))
    .input(articleIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(
        await articlesService.getPreviewById(input.id),
        publicArticleDetailDtoSchema,
      );
    }),
  create: writeProcedure
    .use(requireRoleMiddleware(articlesPolicy.allowedRoles))
    .use(auditResourceMiddleware(() => ({ action: "create", resourceType: "article" })))
    .input(createArticleInputSchema)
    .mutation(async ({ input }) => {
      const article = parseOutput(await articlesService.create(input), articleDtoSchema);
      revalidatePublicArticleContent();
      return article;
    }),
  update: writeProcedure
    .use(requireRoleMiddleware(articlesPolicy.allowedRoles))
    .input(articleIdInputSchema.extend({ data: updateArticleInputSchema }))
    .use(
      auditResourceMiddleware<{ id: string; data: z.infer<typeof updateArticleInputSchema> }>(
        (input) => ({
          action: "update",
          resourceType: "article",
          resourceId: input.id,
        }),
      ),
    )
    .mutation(async ({ input }) => {
      const article = parseOutput(
        await articlesService.update(input.id, input.data),
        articleDtoSchema,
      );
      revalidatePublicArticleContent();
      return article;
    }),
  delete: writeProcedure
    .use(requireRoleMiddleware(articlesPolicy.allowedRoles))
    .input(articleIdInputSchema)
    .use(
      auditResourceMiddleware<{ id: string }>((input) => ({
        action: "delete",
        resourceType: "article",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      await articlesService.delete(input.id);
      revalidatePublicArticleContent();
      return parseOutput({ success: true }, successOutputSchema);
    }),
  syncTags: writeProcedure
    .use(requireRoleMiddleware(articlesPolicy.allowedRoles))
    .input(articleIdInputSchema.extend({ data: syncArticleTagsInputSchema }))
    .use(
      auditResourceMiddleware<{ id: string; data: z.infer<typeof syncArticleTagsInputSchema> }>(
        (input) => ({
          action: "sync_tags",
          resourceType: "article",
          resourceId: input.id,
        }),
      ),
    )
    .mutation(async ({ input }) => {
      const article = parseOutput(
        await articlesService.syncTags(input.id, input.data),
        articleDtoSchema,
      );
      revalidatePublicArticleContent();
      return article;
    }),
  publish: publishProcedure
    .use(requireRoleMiddleware(articlesPolicy.allowedRoles))
    .input(articleIdInputSchema)
    .use(
      auditResourceMiddleware<{ id: string }>((input) => ({
        action: "publish",
        resourceType: "article",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const article = parseOutput(await articlesService.publish(input.id), articleDtoSchema);
      revalidatePublicArticleContent();
      return article;
    }),
  unpublish: writeProcedure
    .use(requireRoleMiddleware(articlesPolicy.allowedRoles))
    .input(articleIdInputSchema)
    .use(
      auditResourceMiddleware<{ id: string }>((input) => ({
        action: "unpublish",
        resourceType: "article",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const article = parseOutput(await articlesService.unpublish(input.id), articleDtoSchema);
      revalidatePublicArticleContent();
      return article;
    }),
  archive: writeProcedure
    .use(requireRoleMiddleware(articlesPolicy.allowedRoles))
    .input(articleIdInputSchema)
    .use(
      auditResourceMiddleware<{ id: string }>((input) => ({
        action: "archive",
        resourceType: "article",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const article = parseOutput(await articlesService.archive(input.id), articleDtoSchema);
      revalidatePublicArticleContent();
      return article;
    }),
  feature: writeProcedure
    .use(requireRoleMiddleware(articlesPolicy.allowedRoles))
    .input(articleIdInputSchema)
    .use(
      auditResourceMiddleware<{ id: string }>((input) => ({
        action: "feature",
        resourceType: "article",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const article = parseOutput(await articlesService.feature(input.id), articleDtoSchema);
      revalidatePublicArticleContent();
      return article;
    }),
  unfeature: writeProcedure
    .use(requireRoleMiddleware(articlesPolicy.allowedRoles))
    .input(articleIdInputSchema)
    .use(
      auditResourceMiddleware<{ id: string }>((input) => ({
        action: "unfeature",
        resourceType: "article",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const article = parseOutput(await articlesService.unfeature(input.id), articleDtoSchema);
      revalidatePublicArticleContent();
      return article;
    }),
});
