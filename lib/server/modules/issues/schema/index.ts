import { z } from "zod";

export const issueTitleStyledSegmentSchema = z.object({
  text: z.string().min(1),
  tone: z.enum(["default", "primary"]).default("default"),
  breakAfter: z.boolean().optional(),
});

export const issueTitleStyledSchema = z.array(issueTitleStyledSegmentSchema).min(1);
export const issueHomeVariantSchema = z.enum(["black", "red", "default"]);
export const issueHomeBlockFeaturedPlacementSchema = z.enum(["left", "right"]);
export const issueHomeBlockPrintSettingsSchema = z.object({
  showInIssueIntro: z.boolean().default(false),
  stopWithSiteCta: z.boolean().default(false),
  excludeFromPrint: z.boolean().default(false),
  showEndLogo: z.boolean().default(false),
});
export const issueHomeArticlePrintLayoutSchema = z.enum(["default", "fullscreen"]);
export const issueHomeArticlePrintSettingsSchema = issueHomeBlockPrintSettingsSchema.extend({
  layout: issueHomeArticlePrintLayoutSchema.default("default"),
});

export const issueHomeArticleBlockSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.enum(["opening", "body", "rupture", "closing"]),
    articleIds: z.array(z.string().uuid()),
    printSettings: z.record(z.string().uuid(), issueHomeArticlePrintSettingsSchema).optional(),
    featuredArticleId: z.string().uuid().nullable().optional(),
    featuredPlacement: issueHomeBlockFeaturedPlacementSchema.default("left"),
  })
  .refine(
    (block) =>
      !["opening", "rupture", "closing"].includes(block.type) || block.articleIds.length <= 1,
    {
      message: "opening, rupture and closing blocks can include at most one article",
      path: ["articleIds"],
    },
  );

export const issueHomeCourseBlockSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("course"),
  courseId: z.string().uuid().nullable(),
  printSettings: issueHomeBlockPrintSettingsSchema.optional(),
});

export const issueHomeMapBlockSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("map"),
  mapId: z.string().uuid().nullable(),
  printSettings: issueHomeBlockPrintSettingsSchema.optional(),
});

export const issueHomeQuestionnaireAnalysisBlockSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("questionnaireAnalysis"),
  questionnaireId: z.string().uuid().nullable(),
  printSettings: issueHomeBlockPrintSettingsSchema.optional(),
});

export const issueHomePreviewBlockSchema = z.object({
  id: z.string().trim().min(1),
  type: z.literal("preview"),
  previewIssueId: z.string().uuid().nullable(),
  printSettings: issueHomeBlockPrintSettingsSchema.optional(),
});

export const issueHomeBlockSchema = z.discriminatedUnion("type", [
  issueHomeArticleBlockSchema,
  issueHomeCourseBlockSchema,
  issueHomeMapBlockSchema,
  issueHomeQuestionnaireAnalysisBlockSchema,
  issueHomePreviewBlockSchema,
]);

export const issueHomeBlocksSchema = z
  .array(issueHomeBlockSchema)
  .refine(
    (blocks) => {
      const articleIds = blocks.flatMap((block) =>
        block.type === "course" ||
        block.type === "map" ||
        block.type === "questionnaireAnalysis" ||
        block.type === "preview"
          ? []
          : block.articleIds,
      );
      return new Set(articleIds).size === articleIds.length;
    },
    {
      message: "articles can be assigned to one home block only",
    },
  )
  .refine((blocks) => blocks.filter((block) => block.type === "preview").length <= 1, {
    message: "an issue can include one preview block only",
  });

export const issuePrintSettingsSchema = z.object({
  showIssueNumber: z.boolean().default(true),
  coverImageUrl: z.string().trim().min(1).nullable().default(null),
  coverImageAlt: z.string().trim().default(""),
  coverImageMode: z.enum(["contained", "bleed"]).default("contained"),
});

export const createIssueInputSchema = z.object({
  title: z.string().trim().min(1),
  titleStyled: issueTitleStyledSchema.nullable().optional(),
  slug: z.string().trim().min(1).optional(),
  description: z.unknown().optional(),
  homeBlocks: issueHomeBlocksSchema.nullable().optional(),
  printSettings: issuePrintSettingsSchema.optional(),
  homeVariant: issueHomeVariantSchema.default("black"),
  isActive: z.boolean().default(true),
  publishedAt: z.coerce.date().nullable().optional(),
});

export const updateIssueInputSchema = createIssueInputSchema
  .partial()
  .extend({
    titleStyled: issueTitleStyledSchema.nullable().optional(),
    description: z.unknown().nullable().optional(),
    homeBlocks: issueHomeBlocksSchema.nullable().optional(),
    printSettings: issuePrintSettingsSchema.optional(),
    homeVariant: issueHomeVariantSchema.optional(),
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
export type IssueHomeArticleBlock = z.infer<typeof issueHomeArticleBlockSchema>;
export type IssueHomeArticlePrintSettings = z.infer<typeof issueHomeArticlePrintSettingsSchema>;
export type IssueHomeBlockPrintSettings = z.infer<typeof issueHomeBlockPrintSettingsSchema>;
export type IssueHomeArticlePrintLayout = z.infer<typeof issueHomeArticlePrintLayoutSchema>;
export type IssueHomeCourseBlock = z.infer<typeof issueHomeCourseBlockSchema>;
export type IssueHomeMapBlock = z.infer<typeof issueHomeMapBlockSchema>;
export type IssueHomeQuestionnaireAnalysisBlock = z.infer<
  typeof issueHomeQuestionnaireAnalysisBlockSchema
>;
export type IssueHomePreviewBlock = z.infer<typeof issueHomePreviewBlockSchema>;
export type IssueHomeBlocks = z.infer<typeof issueHomeBlocksSchema>;
export type IssuePrintSettings = z.infer<typeof issuePrintSettingsSchema>;
export type IssueHomeVariant = z.infer<typeof issueHomeVariantSchema>;
export type IssueTitleStyled = z.infer<typeof issueTitleStyledSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueInputSchema>;
export type ReorderIssuesInput = z.infer<typeof reorderIssuesInputSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
