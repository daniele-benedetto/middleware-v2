import { z } from "zod";

export const issueTitleStyledSegmentSchema = z.object({
  text: z.string().min(1),
  tone: z.enum(["default", "primary"]).default("default"),
});

export const issueTitleStyledSchema = z.array(issueTitleStyledSegmentSchema).min(1);

export const issueHomeBlockSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.enum(["opening", "constellation", "rupture", "sequence", "closing"]),
    source: z.enum(["manual", "remainder"]).default("manual"),
    title: z.string().trim().nullable().optional(),
    description: z.string().trim().nullable().optional(),
    articleIds: z.array(z.string().uuid()),
    featuredArticleId: z.string().uuid().nullable().optional(),
  })
  .refine((block) => block.source === "remainder" || block.articleIds.length > 0, {
    message: "manual home blocks must include at least one article",
    path: ["articleIds"],
  })
  .refine(
    (block) =>
      !["opening", "rupture", "closing"].includes(block.type) || block.articleIds.length <= 1,
    {
      message: "opening, rupture and closing blocks can include at most one article",
      path: ["articleIds"],
    },
  )
  .refine((block) => block.type !== "opening" || (!block.title && !block.description), {
    message: "opening blocks cannot include title or description",
    path: ["title"],
  })
  .refine((block) => block.type !== "rupture" || (!block.title && !block.description), {
    message: "rupture blocks cannot include title or description",
    path: ["title"],
  });

export const issueHomeBlocksSchema = z.array(issueHomeBlockSchema).refine(
  (blocks) => {
    const articleIds = blocks.flatMap((block) => block.articleIds);
    return new Set(articleIds).size === articleIds.length;
  },
  {
    message: "articles can be assigned to one home block only",
  },
);

export const createIssueInputSchema = z.object({
  title: z.string().trim().min(1),
  titleStyled: issueTitleStyledSchema.nullable().optional(),
  slug: z.string().trim().min(1).optional(),
  description: z.unknown().optional(),
  homeBlocks: issueHomeBlocksSchema.nullable().optional(),
  isActive: z.boolean().default(true),
  publishedAt: z.coerce.date().nullable().optional(),
});

export const updateIssueInputSchema = createIssueInputSchema
  .partial()
  .extend({
    titleStyled: issueTitleStyledSchema.nullable().optional(),
    description: z.unknown().nullable().optional(),
    homeBlocks: issueHomeBlocksSchema.nullable().optional(),
    isActive: z.boolean().optional(),
    publishedAt: z.coerce.date().nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export const reorderIssuesInputSchema = z.object({
  orderedIssueIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "orderedIssueIds must be unique",
    }),
});

const sortOrderSchema = z.enum(["asc", "desc"]);
const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");

export const listIssuesQuerySchema = z.object({
  isActive: booleanQuerySchema.optional(),
  published: booleanQuerySchema.optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["createdAt", "sortOrder", "publishedAt"]).default("sortOrder"),
  sortOrder: sortOrderSchema.default("asc"),
});

export type CreateIssueInput = z.infer<typeof createIssueInputSchema>;
export type IssueHomeBlock = z.infer<typeof issueHomeBlockSchema>;
export type IssueHomeBlocks = z.infer<typeof issueHomeBlocksSchema>;
export type IssueTitleStyled = z.infer<typeof issueTitleStyledSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueInputSchema>;
export type ReorderIssuesInput = z.infer<typeof reorderIssuesInputSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
