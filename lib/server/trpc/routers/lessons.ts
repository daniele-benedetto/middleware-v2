import "server-only";

import { z } from "zod";

import { revalidatePublicCourseContent } from "@/lib/public/server/revalidation";
import {
  createLessonInputSchema,
  lessonDetailDtoSchema,
  lessonDtoSchema,
  lessonsListDtoSchema,
  lessonsPolicy,
  lessonsService,
  listLessonsQuerySchema,
  reorderLessonsInputSchema,
  updateLessonInputSchema,
} from "@/lib/server/modules/lessons";
import { publicLessonDetailDtoSchema } from "@/lib/server/modules/lessons/dto/public";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import {
  protectedProcedure,
  publishProcedure,
  reorderProcedure,
  writeProcedure,
} from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { successOutputSchema } from "@/lib/server/trpc/schemas/result";
import { parseOutput } from "@/lib/server/validation/output";

const lessonIdInputSchema = z.object({
  id: z.string().uuid(),
});

const lessonsListInputSchema = paginationInputSchema.extend({
  query: listLessonsQuerySchema.default({
    sortBy: "sortOrder",
    sortOrder: "asc",
  }),
});

export const lessonsRouter = router({
  list: protectedProcedure
    .use(requireRoleMiddleware(lessonsPolicy.allowedRoles))
    .input(lessonsListInputSchema)
    .query(async ({ input }) => {
      const result = await lessonsService.list(input.query, {
        page: input.page,
        pageSize: input.pageSize,
      });

      return {
        items: parseOutput(result.items, lessonsListDtoSchema),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: result.total,
        },
      };
    }),
  getById: protectedProcedure
    .use(requireRoleMiddleware(lessonsPolicy.allowedRoles))
    .input(lessonIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(await lessonsService.getById(input.id), lessonDetailDtoSchema);
    }),
  getPreviewById: protectedProcedure
    .use(requireRoleMiddleware(lessonsPolicy.allowedRoles))
    .input(lessonIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(
        await lessonsService.getPreviewById(input.id),
        publicLessonDetailDtoSchema,
      );
    }),
  create: writeProcedure
    .use(requireRoleMiddleware(lessonsPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "create", resource: "lessons" })))
    .input(createLessonInputSchema)
    .mutation(async ({ input }) => {
      const lesson = parseOutput(await lessonsService.create(input), lessonDtoSchema);
      revalidatePublicCourseContent();
      return lesson;
    }),
  update: writeProcedure
    .use(requireRoleMiddleware(lessonsPolicy.allowedRoles))
    .input(lessonIdInputSchema.extend({ data: updateLessonInputSchema }))
    .use(
      auditMiddleware<{ id: string; data: z.infer<typeof updateLessonInputSchema> }>((input) => ({
        action: "update",
        resource: "lessons",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const lesson = parseOutput(
        await lessonsService.update(input.id, input.data),
        lessonDtoSchema,
      );
      revalidatePublicCourseContent();
      return lesson;
    }),
  delete: writeProcedure
    .use(requireRoleMiddleware(lessonsPolicy.allowedRoles))
    .input(lessonIdInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "delete",
        resource: "lessons",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      await lessonsService.delete(input.id);
      revalidatePublicCourseContent();
      return parseOutput({ success: true }, successOutputSchema);
    }),
  reorder: reorderProcedure
    .use(requireRoleMiddleware(lessonsPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "reorder", resource: "lessons" })))
    .input(reorderLessonsInputSchema)
    .mutation(async ({ input }) => {
      const lessons = parseOutput(await lessonsService.reorder(input), lessonsListDtoSchema);
      revalidatePublicCourseContent();
      return lessons;
    }),
  publish: publishProcedure
    .use(requireRoleMiddleware(lessonsPolicy.allowedRoles))
    .input(lessonIdInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "publish",
        resource: "lessons",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const lesson = parseOutput(await lessonsService.publish(input.id), lessonDtoSchema);
      revalidatePublicCourseContent();
      return lesson;
    }),
  unpublish: writeProcedure
    .use(requireRoleMiddleware(lessonsPolicy.allowedRoles))
    .input(lessonIdInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "unpublish",
        resource: "lessons",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const lesson = parseOutput(await lessonsService.unpublish(input.id), lessonDtoSchema);
      revalidatePublicCourseContent();
      return lesson;
    }),
  archive: writeProcedure
    .use(requireRoleMiddleware(lessonsPolicy.allowedRoles))
    .input(lessonIdInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "archive",
        resource: "lessons",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const lesson = parseOutput(await lessonsService.archive(input.id), lessonDtoSchema);
      revalidatePublicCourseContent();
      return lesson;
    }),
});
