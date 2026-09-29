import { z } from "zod";

import { printEditionManifestSchema, printEditionStatusSchema } from "@/lib/print/edition-schema";

export const createPrintEditionInputSchema = z.object({
  issueId: z.string().uuid(),
  title: z.string().trim().min(1),
  manifest: printEditionManifestSchema,
});

export const updatePrintEditionInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).optional(),
  manifest: printEditionManifestSchema.optional(),
  status: printEditionStatusSchema.optional(),
});

export const printEditionIdInputSchema = z.object({ id: z.string().uuid() });
export const duplicatePrintEditionInputSchema = z.object({ id: z.string().uuid() });
export const printEditionListQuerySchema = z.object({
  issueId: z.string().uuid().optional(),
  status: printEditionStatusSchema.optional(),
});

export type CreatePrintEditionInput = z.infer<typeof createPrintEditionInputSchema>;
export type UpdatePrintEditionInput = z.infer<typeof updatePrintEditionInputSchema>;
export type PrintEditionListQuery = z.infer<typeof printEditionListQuerySchema>;
