import "server-only";

import { z } from "zod";

import {
  publicIssueDetailDtoSchema,
  publicIssuesListDtoSchema,
} from "@/lib/server/modules/issues/dto/public";
import { publicIssuesService } from "@/lib/server/modules/issues/service/public";
import { router } from "@/lib/server/trpc/init";
import { publicReadProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const issueSlugInputSchema = z.object({
  slug: z.string().trim().min(1),
});

export const publicIssuesRouter = router({
  getCurrent: publicReadProcedure.query(async () => {
    return parseOutput(await publicIssuesService.getCurrent(), publicIssueDetailDtoSchema);
  }),
  getBySlug: publicReadProcedure.input(issueSlugInputSchema).query(async ({ input }) => {
    return parseOutput(await publicIssuesService.getBySlug(input.slug), publicIssueDetailDtoSchema);
  }),
  listPublished: publicReadProcedure.input(paginationInputSchema).query(async ({ input }) => {
    const result = await publicIssuesService.listPublished({
      page: input.page,
      pageSize: input.pageSize,
    });

    return {
      items: parseOutput(result.items, publicIssuesListDtoSchema),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
      },
    };
  }),
});
