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
  const parsed = schema.safeParse(input);

  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }

  const issues = parsed.error.issues;
  const firstIssue = issues[0];
  const message = firstIssue ? formatIssueMessage(firstIssue, fieldLabels) : "Dati non validi.";

  return { ok: false, message, issues };
}

function resolveLabel(issue: ZodIssue, fieldLabels: FormFieldLabels): string {
  const path = issue.path.join(".");
  if (path && fieldLabels[path]) {
    return fieldLabels[path];
  }
  return path || "Campo";
}

function formatIssueMessage(issue: ZodIssue, fieldLabels: FormFieldLabels): string {
  const label = resolveLabel(issue, fieldLabels);

  switch (issue.code) {
    case "invalid_type":
      return `${label} e obbligatorio.`;
    case "too_small": {
      const minimum = Number(issue.minimum ?? 0);
      if (issue.origin === "string" && minimum <= 1) {
        return `${label} e obbligatorio.`;
      }
      if (issue.origin === "array") {
        return `${label}: serve almeno ${minimum} elemento/i.`;
      }
      return `${label}: valore troppo piccolo (min ${minimum}).`;
    }
    case "too_big": {
      const maximum = Number(issue.maximum ?? 0);
      return `${label}: valore troppo grande (max ${maximum}).`;
    }
    case "invalid_format": {
      if (issue.format === "email") {
        return `${label}: email non valida.`;
      }
      if (issue.format === "url") {
        return `${label}: URL non valido.`;
      }
      if (issue.format === "uuid") {
        return `${label}: identificativo non valido.`;
      }
      return `${label}: formato non valido.`;
    }
    case "invalid_value":
      return `${label}: valore non ammesso.`;
    default:
      return `${label}: ${issue.message}`;
  }
}
