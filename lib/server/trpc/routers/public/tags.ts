import "server-only";

import { z } from "zod";

import { publicTagDtoSchema, publicTagsListDtoSchema } from "@/lib/server/modules/tags/dto/public";
import { publicTagsService } from "@/lib/server/modules/tags/service/public";
import { router } from "@/lib/server/trpc/init";
import { publicReadProcedure } from "@/lib/server/trpc/procedures";
import { parseOutput } from "@/lib/server/validation/output";

const tagSlugInputSchema = z.object({
  slug: z.string().trim().min(1),
});

export const publicTagsRouter = router({
  list: publicReadProcedure.query(async () => {
    return parseOutput(await publicTagsService.list(), publicTagsListDtoSchema);
  }),
  getBySlug: publicReadProcedure.input(tagSlugInputSchema).query(async ({ input }) => {
    return parseOutput(await publicTagsService.getBySlug(input.slug), publicTagDtoSchema);
  }),
});
