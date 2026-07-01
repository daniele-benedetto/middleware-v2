import { z } from "zod";

export const observabilityMetadataLimits = {
  maxKeys: 20,
  maxKeyLength: 80,
  maxStringLength: 500,
  maxSerializedLength: 2048,
} as const;

const sensitiveMetadataKeyPattern =
  /(authorization|auth|bearer|token|secret|password|passwd|cookie|set-cookie|body|payload|email|credential|session|csrf|api[-_]?key|access[-_]?key|private[-_]?key)/i;

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const bearerPattern = /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const sensitiveQueryPattern =
  /([?&;\s](?:token|auth|authorization|password|secret|cookie|session|csrf|api[-_]?key|access[-_]?key)=)([^\s&#;]+)/gi;
const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export const observabilityMetadataValueSchema = z.union([
  z.string().max(observabilityMetadataLimits.maxStringLength),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const observabilityMetadataSchema = z
  .record(
    z.string().trim().min(1).max(observabilityMetadataLimits.maxKeyLength),
    observabilityMetadataValueSchema,
  )
  .refine((value) => Object.keys(value).length <= observabilityMetadataLimits.maxKeys, {
    message: "Observability metadata can contain at most 20 keys",
  })
  .refine(
    (value) => JSON.stringify(value).length <= observabilityMetadataLimits.maxSerializedLength,
    {
      message: "Observability metadata must be at most 2KB when serialized",
    },
  )
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

export function redactObservabilityText(value: string | null | undefined, maxLength = 500) {
  const normalizedValue = value ? normalizeWhitespace(value) : null;

  if (!normalizedValue) {
    return null;
  }

  return truncate(
    normalizedValue
      .replace(emailPattern, "[email]")
      .replace(bearerPattern, "Bearer [redacted]")
      .replace(sensitiveQueryPattern, "$1[redacted]")
      .replace(uuidPattern, "[uuid]"),
    maxLength,
  );
}

export function sanitizeObservabilityMetadata(value: unknown): ObservabilityMetadata | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const sanitized: ObservabilityMetadata = {};

  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = rawKey.trim().slice(0, observabilityMetadataLimits.maxKeyLength);

    if (!key || hasSensitiveMetadataKey(key)) {
      continue;
    }

    if (Object.keys(sanitized).length >= observabilityMetadataLimits.maxKeys) {
      break;
    }

    if (typeof rawValue === "string") {
      sanitized[key] = redactObservabilityText(
        rawValue,
        observabilityMetadataLimits.maxStringLength,
      );
    } else if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      sanitized[key] = rawValue;
    } else if (typeof rawValue === "boolean" || rawValue === null) {
      sanitized[key] = rawValue;
    }

    if (JSON.stringify(sanitized).length > observabilityMetadataLimits.maxSerializedLength) {
      delete sanitized[key];
      break;
    }
  }

  return Object.keys(sanitized).length ? sanitized : undefined;
}
