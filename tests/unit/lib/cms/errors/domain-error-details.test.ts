import {
  cmsDomainErrorReasons,
  createCmsDomainErrorDetails,
  isCmsDomainErrorDetails,
} from "@/lib/cms/errors/domain-error-details";

describe("domain-error-details", () => {
  it("creates a typed domain error payload", () => {
    expect(createCmsDomainErrorDetails("CATEGORY_DELETE_HAS_ARTICLES")).toEqual({
      reason: "CATEGORY_DELETE_HAS_ARTICLES",
    });
  });

  it.each(cmsDomainErrorReasons)("accepts valid reason %s", (reason) => {
    expect(isCmsDomainErrorDetails({ reason })).toBe(true);
  });

  it("rejects unknown reasons", () => {
    expect(isCmsDomainErrorDetails({ reason: "SOMETHING_ELSE" })).toBe(false);
  });

  it("rejects non-object values", () => {
    expect(isCmsDomainErrorDetails(null)).toBe(false);
    expect(isCmsDomainErrorDetails("CATEGORY_DELETE_HAS_ARTICLES")).toBe(false);
  });
});
