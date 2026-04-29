import { i18n } from "@/lib/i18n";

import type { ZodIssue, ZodType } from "zod";

export type FormFieldLabels = Record<string, string>;

export type FormValidationSuccess<T> = { ok: true; value: T };
export type FormValidationFailure = { ok: false; message: string; issues: ZodIssue[] };
export type FormValidationResult<T> = FormValidationSuccess<T> | FormValidationFailure;

export function validateFormInput<T>(
  schema: ZodType<T>,
  input: unknown,
  fieldLabels: FormFieldLabels = {},
): FormValidationResult<T> {
  const text = i18n.cms.validation;
  const parsed = schema.safeParse(input);

  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }

  const issues = parsed.error.issues;
  const firstIssue = issues[0];
  const message = firstIssue ? formatIssueMessage(firstIssue, fieldLabels) : text.invalidData;

  return { ok: false, message, issues };
}

function resolveLabel(issue: ZodIssue, fieldLabels: FormFieldLabels): string {
  const text = i18n.cms.validation;
  const path = issue.path.join(".");
  if (path && fieldLabels[path]) {
    return fieldLabels[path];
  }
  return path || text.fieldFallback;
}

function formatIssueMessage(issue: ZodIssue, fieldLabels: FormFieldLabels): string {
  const text = i18n.cms.validation;
  const label = resolveLabel(issue, fieldLabels);

  switch (issue.code) {
    case "invalid_type":
      return text.required(label);
    case "too_small": {
      const minimum = Number(issue.minimum ?? 0);
      if (issue.origin === "string" && minimum <= 1) {
        return text.required(label);
      }
      if (issue.origin === "array") {
        return text.arrayMinimum(label, minimum);
      }
      return text.minValue(label, minimum);
    }
    case "too_big": {
      const maximum = Number(issue.maximum ?? 0);
      return text.maxValue(label, maximum);
    }
    case "invalid_format": {
      if (issue.format === "email") {
        return text.invalidEmail(label);
      }
      if (issue.format === "url") {
        return text.invalidUrl(label);
      }
      if (issue.format === "uuid") {
        return text.invalidUuid(label);
      }
      return text.invalidFormat(label);
    }
    case "invalid_value":
      return text.invalidValue(label);
    default:
      return `${label}: ${issue.message}`;
  }
}
