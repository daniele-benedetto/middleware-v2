import { z } from "zod";

export const articleImageSettingsSchema = z.object({
  grayscale: z.boolean().default(true),
  fit: z.enum(["cover", "contain"]).default("cover"),
  positionX: z.number().min(0).max(100).default(50),
  positionY: z.number().min(0).max(100).default(50),
  zoom: z.number().min(100).max(150).default(100),
});

export type ArticleImageSettings = z.infer<typeof articleImageSettingsSchema>;

export const defaultArticleImageSettings: ArticleImageSettings = {
  grayscale: true,
  fit: "cover",
  positionX: 50,
  positionY: 50,
  zoom: 100,
};

export function resolveArticleImageSettings(value: unknown): ArticleImageSettings {
  return articleImageSettingsSchema.catch(defaultArticleImageSettings).parse(value ?? {});
}
