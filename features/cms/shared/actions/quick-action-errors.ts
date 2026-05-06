import { mapTrpcErrorToCmsUiMessage, type CmsUiError } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";

import type { BulkExecutionResult } from "@/features/cms/shared/actions/execute-bulk";

export function mapQuickActionError(error: unknown): CmsUiError {
  return mapTrpcErrorToCmsUiMessage(error);
}

function buildQuickActionErrorSignature(error: CmsUiError) {
  return `${error.code}:${error.reason ?? "generic"}:${error.description}`;
}

export function mapBulkQuickActionError(result: BulkExecutionResult): CmsUiError | null {
  const text = i18n.cms.quickActions;

  if (result.failed <= 0) {
    return null;
  }

  const mappedFailures = result.failures.map((failure) => mapQuickActionError(failure.error));
  const firstError = mappedFailures[0];

  if (!firstError) {
    return {
      code: "INTERNAL_SERVER_ERROR",
      title: text.partialExecutionTitle,
      description: text.partialExecutionSummary(result.failed, result.success + result.failed),
      retryable: true,
    };
  }

  const firstSignature = buildQuickActionErrorSignature(firstError);
  const allSameError = mappedFailures.every(
    (item) => buildQuickActionErrorSignature(item) === firstSignature,
  );

  if (allSameError) {
    return {
      ...firstError,
      description: `${firstError.description} (${result.failed} errori su ${result.success + result.failed} elementi).`,
    };
  }

  return {
    code: "INTERNAL_SERVER_ERROR",
    title: text.partialExecutionTitle,
    description: text.partialExecutionMixedSummary(result.success, result.failed),
    retryable: mappedFailures.some((item) => item.retryable),
  };
}
