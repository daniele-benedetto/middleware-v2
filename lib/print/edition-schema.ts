import { z } from "zod";

import { PRINT_PAGE_FAMILIES } from "@/lib/print/manifest";

export const printEditionStatusSchema = z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "EXPORTED"]);

export const printEditionOverrideSchema = z.object({
  itemId: z.string().min(1),
  preferredFamily: z.enum(PRINT_PAGE_FAMILIES).optional(),
  lockedPage: z.number().int().positive().optional(),
  excluded: z.boolean().optional(),
  selectedImageUrl: z.string().trim().min(1).nullable().optional(),
});

export const printEditionManifestSchema = z.object({
  issueId: z.string().uuid(),
  title: z.string().trim().min(1),
  issueNumber: z.string().trim().min(1),
  format: z.literal("a4-portrait"),
  pageCountMultiple: z.literal(4),
  overrides: z.array(printEditionOverrideSchema).default([]),
});

export const printEditionSchema = z.object({
  id: z.string().uuid(),
  issueId: z.string().uuid(),
  title: z.string().trim().min(1),
  status: printEditionStatusSchema,
  manifest: printEditionManifestSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type PrintEditionStatus = z.infer<typeof printEditionStatusSchema>;
export type PrintEditionOverride = z.infer<typeof printEditionOverrideSchema>;
export type PrintEditionManifestInput = z.infer<typeof printEditionManifestSchema>;
export type PrintEdition = z.infer<typeof printEditionSchema>;
