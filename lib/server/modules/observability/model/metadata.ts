import { z } from "zod";

const sensitiveMetadataKeyPattern =
  /(authorization|token|secret|password|cookie|set-cookie|body|payload|email)/i;

export const observabilityMetadataValueSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const observabilityMetadataSchema = z
  .record(z.string().trim().min(1).max(80), observabilityMetadataValueSchema)
  .refine((value) => Object.keys(value).length <= 20, {
    message: "Observability metadata can contain at most 20 keys",
  })
  .refine((value) => JSON.stringify(value).length <= 2048, {
    message: "Observability metadata must be at most 2KB when serialized",
  })
  .refine((value) => Object.keys(value).every((key) => !sensitiveMetadataKeyPattern.test(key)), {
    message: "Observability metadata cannot contain sensitive keys",
  });

export type ObservabilityMetadata = z.infer<typeof observabilityMetadataSchema>;

export function parseObservabilityMetadata(value: unknown) {
  const result = observabilityMetadataSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

export function hasSensitiveMetadataKey(value: string) {
  return sensitiveMetadataKeyPattern.test(value);
}
