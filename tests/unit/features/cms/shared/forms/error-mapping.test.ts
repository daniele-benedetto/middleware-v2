import { mapCrudDomainError } from "@/features/cms/shared/forms";
import { i18n } from "@/lib/i18n";
import { createCmsTrpcError } from "@/tests/helpers/create-cms-trpc-error";

describe("mapCrudDomainError", () => {
  it("preserves domain-specific error copy when the backend provides a typed reason", () => {
    expect(
      mapCrudDomainError(
        createCmsTrpcError({
          code: "CONFLICT",
          reason: "CATEGORY_DELETE_HAS_ARTICLES",
        }),
        "categories",
      ),
    ).toEqual({
      code: "CONFLICT",
      reason: "CATEGORY_DELETE_HAS_ARTICLES",
      title: i18n.cms.trpcErrors.domain.categoryDeleteHasArticlesTitle,
      description: i18n.cms.trpcErrors.domain.categoryDeleteHasArticlesDescription,
      retryable: false,
    });
  });

  it("applies the article-specific conflict title for generic article conflicts", () => {
    expect(mapCrudDomainError(createCmsTrpcError({ code: "CONFLICT" }), "articles")).toEqual({
      code: "CONFLICT",
      reason: undefined,
      title: i18n.cms.lists.articles.domainErrors.slugConflictTitle,
      description: i18n.cms.trpcErrors.conflictDescription,
      retryable: false,
    });
  });

  it("leaves non-conflict errors unchanged", () => {
    expect(mapCrudDomainError(createCmsTrpcError({ code: "FORBIDDEN" }), "users")).toEqual({
      code: "FORBIDDEN",
      reason: undefined,
      title: i18n.cms.trpcErrors.forbiddenTitle,
      description: i18n.cms.trpcErrors.forbiddenDescription,
      retryable: false,
    });
  });
});
