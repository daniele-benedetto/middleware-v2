import "server-only";

import { z } from "zod";

import { revalidatePublicPageContent } from "@/lib/public/server/revalidation";
import {
  createPageInputSchema,
  listPagesQuerySchema,
  pageDetailDtoSchema,
  pageDtoSchema,
  pagesListDtoSchema,
  pagesPolicy,
  pagesService,
  updatePageInputSchema,
} from "@/lib/server/modules/pages";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure, writeProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const pageIdInputSchema = z.object({
  id: z.string().uuid(),
});

const pagesListInputSchema = paginationInputSchema.extend({
  query: listPagesQuerySchema.default({
    sortBy: "updatedAt",
    sortOrder: "desc",
  }),
});

export const pagesRouter = router({
  list: protectedProcedure
    .use(requireRoleMiddleware(pagesPolicy.allowedRoles))
    .input(pagesListInputSchema)
    .query(async ({ input }) => {
      const result = await pagesService.list(input.query, {
        page: input.page,
        pageSize: input.pageSize,
      });

      return {
        items: parseOutput(result.items, pagesListDtoSchema),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: result.total,
        },
      };
    }),
  getById: protectedProcedure
    .use(requireRoleMiddleware(pagesPolicy.allowedRoles))
    .input(pageIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(await pagesService.getById(input.id), pageDetailDtoSchema);
    }),
  create: writeProcedure
    .use(requireRoleMiddleware(pagesPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "create", resource: "pages" })))
    .input(createPageInputSchema)
    .mutation(async ({ input }) => {
      const page = parseOutput(await pagesService.create(input), pageDtoSchema);
      revalidatePublicPageContent();
      return page;
    }),
  update: writeProcedure
    .use(requireRoleMiddleware(pagesPolicy.allowedRoles))
    .input(pageIdInputSchema.extend({ data: updatePageInputSchema }))
    .use(
      auditMiddleware<{ id: string; data: z.infer<typeof updatePageInputSchema> }>((input) => ({
        action: "update",
        resource: "pages",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const page = parseOutput(await pagesService.update(input.id, input.data), pageDtoSchema);
      revalidatePublicPageContent();
      return page;
    }),
  delete: writeProcedure
    .use(requireRoleMiddleware(pagesPolicy.allowedRoles))
    .input(pageIdInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "delete",
        resource: "pages",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      await pagesService.delete(input.id);
      revalidatePublicPageContent();
      return { success: true };
    }),
  publish: writeProcedure
    .use(requireRoleMiddleware(pagesPolicy.allowedRoles))
    .input(pageIdInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "publish",
        resource: "pages",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const page = parseOutput(await pagesService.publish(input.id), pageDtoSchema);
      revalidatePublicPageContent();
      return page;
    }),
  unpublish: writeProcedure
    .use(requireRoleMiddleware(pagesPolicy.allowedRoles))
    .input(pageIdInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "unpublish",
        resource: "pages",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const page = parseOutput(await pagesService.unpublish(input.id), pageDtoSchema);
      revalidatePublicPageContent();
      return page;
    }),
  archive: writeProcedure
    .use(requireRoleMiddleware(pagesPolicy.allowedRoles))
    .input(pageIdInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "archive",
        resource: "pages",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const page = parseOutput(await pagesService.archive(input.id), pageDtoSchema);
      revalidatePublicPageContent();
      return page;
    }),
});
