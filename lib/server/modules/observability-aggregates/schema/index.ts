import { z } from "zod";

export const observabilityAggregateDomainValues = [
  "content",
  "errors",
  "performance",
  "audit",
  "all",
] as const;

export const observabilityAggregateDomainSchema = z.enum(observabilityAggregateDomainValues);

export const observabilityAggregationJobInputSchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    days: z.number().int().min(1).max(90).default(7),
    domains: z.array(observabilityAggregateDomainSchema).min(1).default(["all"]),
    force: z.boolean().default(false),
    dryRun: z.boolean().default(false),
  })
  .refine((value) => !value.from === !value.to, {
    message: "from and to must be provided together",
    path: ["to"],
  });

export const observabilityAggregateQuerySchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
  pageType: z.string().trim().min(1).max(80).optional(),
  contentType: z.string().trim().min(1).max(80).optional(),
  contentId: z.string().trim().min(1).max(120).optional(),
  path: z.string().trim().min(1).max(512).optional(),
  deviceType: z.string().trim().min(1).max(80).optional(),
  release: z.string().trim().min(1).max(120).optional(),
  severity: z.string().trim().min(1).max(80).optional(),
  status: z.string().trim().min(1).max(80).optional(),
  riskLevel: z.string().trim().min(1).max(80).optional(),
  outcome: z.string().trim().min(1).max(80).optional(),
});

export type ObservabilityAggregateDomain = z.infer<typeof observabilityAggregateDomainSchema>;
export type ObservabilityAggregationJobInput = z.infer<
  typeof observabilityAggregationJobInputSchema
>;
export type ObservabilityAggregateQuery = z.infer<typeof observabilityAggregateQuerySchema>;
