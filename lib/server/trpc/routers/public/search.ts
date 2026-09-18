import "server-only";

import { publicSearchResponseDtoSchema } from "@/lib/server/modules/search/dto";
import { publicSearchInputSchema } from "@/lib/server/modules/search/schema";
import { publicSearchService } from "@/lib/server/modules/search/service";
import { router } from "@/lib/server/trpc/init";
import { publicReadProcedure } from "@/lib/server/trpc/procedures";
import { parseOutput } from "@/lib/server/validation/output";

export const publicSearchRouter = router({
  search: publicReadProcedure.input(publicSearchInputSchema).query(async ({ input }) => {
    return parseOutput(
      await publicSearchService.search(input.q, input.limit),
      publicSearchResponseDtoSchema,
    );
  }),
});
