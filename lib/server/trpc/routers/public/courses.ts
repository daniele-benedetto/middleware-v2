import "server-only";

import { z } from "zod";

import {
  publicCourseDetailDtoSchema,
  publicCoursesListDtoSchema,
} from "@/lib/server/modules/courses/dto/public";
import { publicCoursesService } from "@/lib/server/modules/courses/service/public";
import { router } from "@/lib/server/trpc/init";
import { publicReadProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const courseSlugInputSchema = z.object({
  slug: z.string().trim().min(1),
});

export const publicCoursesRouter = router({
  getBySlug: publicReadProcedure.input(courseSlugInputSchema).query(async ({ input }) => {
    return parseOutput(
      await publicCoursesService.getBySlug(input.slug),
      publicCourseDetailDtoSchema,
    );
  }),
  listPublished: publicReadProcedure.input(paginationInputSchema).query(async ({ input }) => {
    const result = await publicCoursesService.listPublished({
      page: input.page,
      pageSize: input.pageSize,
    });

    return {
      items: parseOutput(result.items, publicCoursesListDtoSchema),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
      },
    };
  }),
});
