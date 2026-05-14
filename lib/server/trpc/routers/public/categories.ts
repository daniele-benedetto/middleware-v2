import "server-only";

import { z } from "zod";

import {
  publicCategoriesListDtoSchema,
  publicCategoryDtoSchema,
} from "@/lib/server/modules/categories/dto/public";
import { publicCategoriesService } from "@/lib/server/modules/categories/service/public";
import { router } from "@/lib/server/trpc/init";
import { publicReadProcedure } from "@/lib/server/trpc/procedures";
import { parseOutput } from "@/lib/server/validation/output";

const categorySlugInputSchema = z.object({
  slug: z.string().trim().min(1),
});

export const publicCategoriesRouter = router({
  list: publicReadProcedure.query(async () => {
    return parseOutput(await publicCategoriesService.list(), publicCategoriesListDtoSchema);
  }),
  getBySlug: publicReadProcedure.input(categorySlugInputSchema).query(async ({ input }) => {
    return parseOutput(
      await publicCategoriesService.getBySlug(input.slug),
      publicCategoryDtoSchema,
    );
  }),
});
