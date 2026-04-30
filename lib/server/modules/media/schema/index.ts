import { z } from "zod";

export const renameMediaInputSchema = z.object({
  url: z.string().trim().url(),
  name: z.string().trim().min(1),
});

export const deleteMediaInputSchema = z.object({
  url: z.string().trim().url(),
});

export type RenameMediaInput = z.infer<typeof renameMediaInputSchema>;
export type DeleteMediaInput = z.infer<typeof deleteMediaInputSchema>;
