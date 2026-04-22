import { z } from "zod";

import { paginationDefaults } from "@/lib/server/http/pagination";

export const paginationInputSchema = z.object({
  page: z.number().int().min(1).default(paginationDefaults.page),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(paginationDefaults.maxPageSize)
    .default(paginationDefaults.pageSize),
});
