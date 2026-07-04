import { z } from "zod";

const mediaUrlSchema = z.string().trim().min(1);

export const renameMediaInputSchema = z.object({
  url: mediaUrlSchema,
  name: z.string().trim().min(1),
});

export const deleteMediaInputSchema = z.object({
  url: mediaUrlSchema,
});

export type RenameMediaInput = z.infer<typeof renameMediaInputSchema>;
export type DeleteMediaInput = z.infer<typeof deleteMediaInputSchema>;
