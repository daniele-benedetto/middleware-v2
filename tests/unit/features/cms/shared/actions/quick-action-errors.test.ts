import { mapBulkQuickActionError, mapQuickActionError } from "@/features/cms/shared/actions";
import { i18n } from "@/lib/i18n";
import { createCmsTrpcError } from "@/tests/helpers/create-cms-trpc-error";

import type { BulkExecutionResult } from "@/features/cms/shared/actions/execute-bulk";

function createBulkExecutionResult(partial?: Partial<BulkExecutionResult>): BulkExecutionResult {
  return {
    success: 0,
    failed: 0,
    failures: [],
    ...partial,
  };
}

describe("mapQuickActionError", () => {
  it("reuses the shared TRPC-to-UI mapper", () => {
    expect(
      mapQuickActionError(
        createCmsTrpcError({
          code: "CONFLICT",
          reason: "CATEGORY_DELETE_HAS_ARTICLES",
        }),
      ),
    ).toEqual({
      code: "CONFLICT",
      reason: "CATEGORY_DELETE_HAS_ARTICLES",
      title: i18n.cms.trpcErrors.domain.categoryDeleteHasArticlesTitle,
      description: i18n.cms.trpcErrors.domain.categoryDeleteHasArticlesDescription,
      retryable: false,
    });
  });
});

describe("mapBulkQuickActionError", () => {
  it("returns null when there are no failures", () => {
    expect(mapBulkQuickActionError(createBulkExecutionResult())).toBeNull();
  });

  it("appends counts when all failures are the same domain error", () => {
    const result = createBulkExecutionResult({
      success: 1,
      failed: 2,
      failures: [
        {
          id: "cat-1",
          error: createCmsTrpcError({
            code: "CONFLICT",
            reason: "CATEGORY_DELETE_HAS_ARTICLES",
          }),
        },
        {
          id: "cat-2",
          error: createCmsTrpcError({
            code: "CONFLICT",
            reason: "CATEGORY_DELETE_HAS_ARTICLES",
          }),
        },
      ],
    });

    expect(mapBulkQuickActionError(result)).toEqual({
      code: "CONFLICT",
      reason: "CATEGORY_DELETE_HAS_ARTICLES",
      title: i18n.cms.trpcErrors.domain.categoryDeleteHasArticlesTitle,
      description: `${i18n.cms.trpcErrors.domain.categoryDeleteHasArticlesDescription} (2 errori su 3 elementi).`,
      retryable: false,
    });
  });

  it("does not collapse different reasons that share the same TRPC code", () => {
    const result = createBulkExecutionResult({
      success: 1,
      failed: 2,
      failures: [
        {
          id: "cat-1",
          error: createCmsTrpcError({
            code: "CONFLICT",
            reason: "CATEGORY_DELETE_HAS_ARTICLES",
          }),
        },
        {
          id: "tag-1",
          error: createCmsTrpcError({
            code: "CONFLICT",
            reason: "TAG_DELETE_HAS_ARTICLES",
          }),
        },
      ],
    });

    expect(mapBulkQuickActionError(result)).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      title: i18n.cms.quickActions.partialExecutionTitle,
      description: i18n.cms.quickActions.partialExecutionMixedSummary(1, 2),
      retryable: false,
    });
  });

  it("marks mixed failures as retryable when at least one error is retryable", () => {
    const result = createBulkExecutionResult({
      failed: 2,
      failures: [
        {
          id: "rate-limited",
          error: createCmsTrpcError({
            code: "TOO_MANY_REQUESTS",
          }),
        },
        {
          id: "conflict",
          error: createCmsTrpcError({
            code: "CONFLICT",
            reason: "USER_EMAIL_EXISTS",
          }),
        },
      ],
    });

    expect(mapBulkQuickActionError(result)).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      title: i18n.cms.quickActions.partialExecutionTitle,
      description: i18n.cms.quickActions.partialExecutionMixedSummary(0, 2),
      retryable: true,
    });
  });
});
