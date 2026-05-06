import {
  hasCmsTrpcErrorCode,
  isCmsNotFoundLikeError,
  mapTrpcErrorToCmsUiMessage,
} from "@/lib/cms/trpc/error-messages";
import { i18n } from "@/lib/i18n";
import { createCmsTrpcError } from "@/tests/helpers/create-cms-trpc-error";

describe("mapTrpcErrorToCmsUiMessage", () => {
  const domainCases = [
    {
      code: "CONFLICT" as const,
      reason: "ARTICLE_SLUG_EXISTS_IN_ISSUE" as const,
      title: i18n.cms.lists.articles.domainErrors.slugConflictTitle,
      description: i18n.cms.lists.articles.domainErrors.slugConflictDescription,
    },
    {
      code: "BAD_REQUEST" as const,
      reason: "ARTICLE_INVALID_RELATIONS" as const,
      title: i18n.cms.lists.articles.domainErrors.invalidRelationsTitle,
      description: i18n.cms.lists.articles.domainErrors.invalidRelationsDescription,
    },
    {
      code: "BAD_REQUEST" as const,
      reason: "ARTICLE_INVALID_TAGS" as const,
      title: i18n.cms.lists.articles.domainErrors.invalidTagsTitle,
      description: i18n.cms.lists.articles.domainErrors.invalidTagsDescription,
    },
    {
      code: "BAD_REQUEST" as const,
      reason: "ARTICLE_REORDER_IDS_MISMATCH" as const,
      title: i18n.cms.lists.articles.domainErrors.reorderInvalidTitle,
      description: i18n.cms.lists.articles.domainErrors.reorderInvalidDescription,
    },
    {
      code: "CONFLICT" as const,
      reason: "CATEGORY_DELETE_HAS_ARTICLES" as const,
      title: i18n.cms.trpcErrors.domain.categoryDeleteHasArticlesTitle,
      description: i18n.cms.trpcErrors.domain.categoryDeleteHasArticlesDescription,
    },
    {
      code: "CONFLICT" as const,
      reason: "CATEGORY_SLUG_EXISTS" as const,
      title: i18n.cms.trpcErrors.domain.categorySlugExistsTitle,
      description: i18n.cms.trpcErrors.domain.categorySlugExistsDescription,
    },
    {
      code: "BAD_REQUEST" as const,
      reason: "ISSUE_ARTICLE_ORDER_MISMATCH" as const,
      title: i18n.cms.trpcErrors.domain.issueArticleOrderMismatchTitle,
      description: i18n.cms.trpcErrors.domain.issueArticleOrderMismatchDescription,
    },
    {
      code: "CONFLICT" as const,
      reason: "ISSUE_DELETE_HAS_ARTICLES" as const,
      title: i18n.cms.trpcErrors.domain.issueDeleteHasArticlesTitle,
      description: i18n.cms.trpcErrors.domain.issueDeleteHasArticlesDescription,
    },
    {
      code: "CONFLICT" as const,
      reason: "ISSUE_SLUG_EXISTS" as const,
      title: i18n.cms.trpcErrors.domain.issueSlugExistsTitle,
      description: i18n.cms.trpcErrors.domain.issueSlugExistsDescription,
    },
    {
      code: "CONFLICT" as const,
      reason: "TAG_DELETE_HAS_ARTICLES" as const,
      title: i18n.cms.trpcErrors.domain.tagDeleteHasArticlesTitle,
      description: i18n.cms.trpcErrors.domain.tagDeleteHasArticlesDescription,
    },
    {
      code: "CONFLICT" as const,
      reason: "TAG_SLUG_EXISTS" as const,
      title: i18n.cms.trpcErrors.domain.tagSlugExistsTitle,
      description: i18n.cms.trpcErrors.domain.tagSlugExistsDescription,
    },
    {
      code: "CONFLICT" as const,
      reason: "USER_DELETE_HAS_AUTHORED_ARTICLES" as const,
      title: i18n.cms.trpcErrors.domain.userDeleteHasArticlesTitle,
      description: i18n.cms.trpcErrors.domain.userDeleteHasArticlesDescription,
    },
    {
      code: "CONFLICT" as const,
      reason: "USER_EMAIL_EXISTS" as const,
      title: i18n.cms.trpcErrors.domain.userEmailExistsTitle,
      description: i18n.cms.trpcErrors.domain.userEmailExistsDescription,
    },
    {
      code: "FORBIDDEN" as const,
      reason: "USER_SELF_DELETE_FORBIDDEN" as const,
      title: i18n.cms.trpcErrors.domain.userSelfDeleteForbiddenTitle,
      description: i18n.cms.trpcErrors.domain.userSelfDeleteForbiddenDescription,
    },
    {
      code: "FORBIDDEN" as const,
      reason: "USER_SELF_ROLE_CHANGE_FORBIDDEN" as const,
      title: i18n.cms.trpcErrors.domain.userSelfRoleChangeForbiddenTitle,
      description: i18n.cms.trpcErrors.domain.userSelfRoleChangeForbiddenDescription,
    },
  ];

  it.each(domainCases)("maps $reason to the expected CMS message", (testCase) => {
    expect(
      mapTrpcErrorToCmsUiMessage(
        createCmsTrpcError({
          code: testCase.code,
          reason: testCase.reason,
        }),
      ),
    ).toEqual({
      code: testCase.code,
      reason: testCase.reason,
      title: testCase.title,
      description: testCase.description,
      retryable: false,
    });
  });

  it("uses BAD_REQUEST string details when present", () => {
    expect(
      mapTrpcErrorToCmsUiMessage(
        createCmsTrpcError({
          code: "BAD_REQUEST",
          details: "Slug non valido.",
        }),
      ),
    ).toEqual({
      code: "BAD_REQUEST",
      reason: undefined,
      title: i18n.cms.trpcErrors.badRequestTitle,
      description: "Slug non valido.",
      retryable: false,
    });
  });

  it("uses the first BAD_REQUEST array detail when present", () => {
    expect(
      mapTrpcErrorToCmsUiMessage(
        createCmsTrpcError({
          code: "BAD_REQUEST",
          details: ["Campo mancante.", "Secondo dettaglio"],
        }),
      ),
    ).toEqual({
      code: "BAD_REQUEST",
      reason: undefined,
      title: i18n.cms.trpcErrors.badRequestTitle,
      description: "Campo mancante.",
      retryable: false,
    });
  });

  it("falls back to generic conflict copy when the reason is missing", () => {
    expect(mapTrpcErrorToCmsUiMessage(createCmsTrpcError({ code: "CONFLICT" }))).toEqual({
      code: "CONFLICT",
      reason: undefined,
      title: i18n.cms.trpcErrors.conflictTitle,
      description: i18n.cms.trpcErrors.conflictDescription,
      retryable: false,
    });
  });

  it("reads the code from shape.data when needed", () => {
    expect(
      mapTrpcErrorToCmsUiMessage(
        createCmsTrpcError({
          shapeCode: "UNAUTHORIZED",
        }),
      ),
    ).toEqual({
      code: "UNAUTHORIZED",
      reason: undefined,
      title: i18n.cms.trpcErrors.unauthorizedTitle,
      description: i18n.cms.trpcErrors.unauthorizedDescription,
      retryable: false,
    });
  });

  it("reads the code and message from cause when needed", () => {
    expect(
      mapTrpcErrorToCmsUiMessage(
        createCmsTrpcError({
          message: "No permission.",
          includeCause: true,
          causeCode: "FORBIDDEN",
        }),
      ),
    ).toEqual({
      code: "FORBIDDEN",
      reason: undefined,
      title: i18n.cms.trpcErrors.forbiddenTitle,
      description: i18n.cms.trpcErrors.forbiddenDescription,
      retryable: false,
    });
  });

  it("ignores unknown domain reasons and falls back to generic copy", () => {
    expect(
      mapTrpcErrorToCmsUiMessage(
        createCmsTrpcError({
          code: "CONFLICT",
          details: { reason: "SOMETHING_ELSE" },
        }),
      ),
    ).toEqual({
      code: "CONFLICT",
      reason: undefined,
      title: i18n.cms.trpcErrors.conflictTitle,
      description: i18n.cms.trpcErrors.conflictDescription,
      retryable: false,
    });
  });

  it("falls back to generic internal error for unknown inputs", () => {
    expect(mapTrpcErrorToCmsUiMessage(new Error("boom"))).toEqual({
      code: "INTERNAL_SERVER_ERROR",
      reason: undefined,
      title: i18n.cms.trpcErrors.internalErrorTitle,
      description: i18n.cms.trpcErrors.internalErrorDescription,
      retryable: true,
    });
  });
});

describe("hasCmsTrpcErrorCode", () => {
  it("detects codes from top-level data", () => {
    expect(hasCmsTrpcErrorCode(createCmsTrpcError({ code: "NOT_FOUND" }), "NOT_FOUND")).toBe(true);
  });

  it("returns false when codes do not match", () => {
    expect(hasCmsTrpcErrorCode(createCmsTrpcError({ code: "FORBIDDEN" }), "NOT_FOUND")).toBe(false);
  });
});

describe("isCmsNotFoundLikeError", () => {
  it("returns true for NOT_FOUND codes", () => {
    expect(isCmsNotFoundLikeError(createCmsTrpcError({ code: "NOT_FOUND" }))).toBe(true);
  });

  it("returns true when the message mentions not found", () => {
    expect(isCmsNotFoundLikeError({ message: "Article not found" })).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isCmsNotFoundLikeError({ message: "Validation failed" })).toBe(false);
  });
});
