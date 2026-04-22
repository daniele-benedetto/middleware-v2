import { z } from "zod";

export const issueDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
});

export const issuesListDtoSchema = z.array(issueDtoSchema);

export type IssueDto = z.infer<typeof issueDtoSchema>;
