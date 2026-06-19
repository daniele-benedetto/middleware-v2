import "server-only";

import {
  publicPageDtoSchema,
  publicPagesListDtoSchema,
} from "@/lib/server/modules/pages/dto/public";
import { publicPageSlugInputSchema } from "@/lib/server/modules/pages/schema/public";
import { publicPagesService } from "@/lib/server/modules/pages/service/public";
import { router } from "@/lib/server/trpc/init";
import { publicReadProcedure } from "@/lib/server/trpc/procedures";
import { parseOutput } from "@/lib/server/validation/output";

export const publicPagesRouter = router({
  getBySlug: publicReadProcedure.input(publicPageSlugInputSchema).query(async ({ input }) => {
    return parseOutput(await publicPagesService.getBySlug(input.slug), publicPageDtoSchema);
  }),
  listPublished: publicReadProcedure.query(async () => {
    return parseOutput(await publicPagesService.listPublished(), publicPagesListDtoSchema);
  }),
});
