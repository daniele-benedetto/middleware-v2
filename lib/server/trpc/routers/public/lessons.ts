import "server-only";

import {
  publicLessonDetailDtoSchema,
  publicLessonsListDtoSchema,
} from "@/lib/server/modules/lessons/dto/public";
import {
  publicLessonByCourseInputSchema,
  publicLessonSlugInputSchema,
} from "@/lib/server/modules/lessons/schema/public";
import { publicLessonsService } from "@/lib/server/modules/lessons/service/public";
import { router } from "@/lib/server/trpc/init";
import { publicReadProcedure } from "@/lib/server/trpc/procedures";
import { parseOutput } from "@/lib/server/validation/output";

export const publicLessonsRouter = router({
  getBySlug: publicReadProcedure.input(publicLessonSlugInputSchema).query(async ({ input }) => {
    return parseOutput(
      await publicLessonsService.getBySlug(input.courseSlug, input.lessonSlug),
      publicLessonDetailDtoSchema,
    );
  }),
  listByCourse: publicReadProcedure
    .input(publicLessonByCourseInputSchema)
    .query(async ({ input }) => {
      return parseOutput(
        await publicLessonsService.listByCourse(input.courseSlug),
        publicLessonsListDtoSchema,
      );
    }),
  listWithAudio: publicReadProcedure.query(async () => {
    return parseOutput(await publicLessonsService.listWithAudio(), publicLessonsListDtoSchema);
  }),
});
