import "server-only";

import { z } from "zod";

import { revalidatePublicCourseContent } from "@/lib/public/server/revalidation";
import {
  courseDetailDtoSchema,
  courseDtoSchema,
  coursesListDtoSchema,
  coursesPolicy,
  coursesService,
  createCourseInputSchema,
  listCoursesQuerySchema,
  reorderCoursesInputSchema,
  updateCourseInputSchema,
} from "@/lib/server/modules/courses";
import { publicCourseDetailDtoSchema } from "@/lib/server/modules/courses/dto/public";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure, reorderProcedure, writeProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { successOutputSchema } from "@/lib/server/trpc/schemas/result";
import { parseOutput } from "@/lib/server/validation/output";

const courseIdInputSchema = z.object({
  id: z.string().uuid(),
});

const coursesListInputSchema = paginationInputSchema.extend({
  query: listCoursesQuerySchema.default({
    sortBy: "sortOrder",
    sortOrder: "asc",
  }),
});

export const coursesRouter = router({
  list: protectedProcedure
    .use(requireRoleMiddleware(coursesPolicy.allowedRoles))
    .input(coursesListInputSchema)
    .query(async ({ input }) => {
      const result = await coursesService.list(input.query, {
        page: input.page,
        pageSize: input.pageSize,
      });

      return {
        items: parseOutput(result.items, coursesListDtoSchema),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total: result.total,
        },
      };
    }),
  getById: protectedProcedure
    .use(requireRoleMiddleware(coursesPolicy.allowedRoles))
    .input(courseIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(await coursesService.getById(input.id), courseDetailDtoSchema);
    }),
  getPreviewById: protectedProcedure
    .use(requireRoleMiddleware(coursesPolicy.allowedRoles))
    .input(courseIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(
        await coursesService.getPreviewById(input.id),
        publicCourseDetailDtoSchema,
      );
    }),
  create: writeProcedure
    .use(requireRoleMiddleware(coursesPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "create", resource: "courses" })))
    .input(createCourseInputSchema)
    .mutation(async ({ input }) => {
      const course = parseOutput(await coursesService.create(input), courseDtoSchema);
      revalidatePublicCourseContent();
      return course;
    }),
  update: writeProcedure
    .use(requireRoleMiddleware(coursesPolicy.allowedRoles))
    .input(
      courseIdInputSchema.extend({
        data: updateCourseInputSchema,
      }),
    )
    .use(
      auditMiddleware<{
        id: string;
        data: z.infer<typeof updateCourseInputSchema>;
      }>((input) => ({
        action: "update",
        resource: "courses",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      const course = parseOutput(
        await coursesService.update(input.id, input.data),
        courseDtoSchema,
      );
      revalidatePublicCourseContent();
      return course;
    }),
  delete: writeProcedure
    .use(requireRoleMiddleware(coursesPolicy.allowedRoles))
    .input(courseIdInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "delete",
        resource: "courses",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      await coursesService.delete(input.id);
      revalidatePublicCourseContent();
      return parseOutput({ success: true }, successOutputSchema);
    }),
  reorder: reorderProcedure
    .use(requireRoleMiddleware(coursesPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "reorder", resource: "courses" })))
    .input(reorderCoursesInputSchema)
    .mutation(async ({ input }) => {
      const courses = parseOutput(await coursesService.reorder(input), coursesListDtoSchema);
      revalidatePublicCourseContent();
      return courses;
    }),
});
