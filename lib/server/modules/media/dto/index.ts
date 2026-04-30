import { z } from "zod";

export const mediaArticleReferenceDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  field: z.enum(["imageUrl", "audioUrl", "audioChunks"]),
});

export const mediaItemDtoSchema = z.object({
  url: z.string().url(),
  downloadUrl: z.string().url(),
  pathname: z.string(),
  directory: z.string(),
  fileName: z.string(),
  baseName: z.string(),
  extension: z.string(),
  kind: z.enum(["image", "audio", "json", "other"]),
  size: z.number().int().nonnegative(),
  uploadedAt: z.string(),
  etag: z.string(),
  articleReferences: z.array(mediaArticleReferenceDtoSchema),
});

export const mediaListDtoSchema = z.object({
  items: z.array(mediaItemDtoSchema),
});

export const renameMediaResultDtoSchema = z.object({
  item: mediaItemDtoSchema,
  articleIds: z.array(z.string().uuid()),
});

export const deleteMediaResultDtoSchema = z.object({
  success: z.literal(true),
  articleIds: z.array(z.string().uuid()),
});

export type MediaItemDto = z.infer<typeof mediaItemDtoSchema>;
