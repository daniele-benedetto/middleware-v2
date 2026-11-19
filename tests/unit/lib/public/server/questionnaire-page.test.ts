const publicQuestionnairesServiceMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
  getClosedAnalysisBySlug: vi.fn(),
}));
const cacheMock = vi.hoisted(() => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("next/cache", () => cacheMock);

vi.mock("@/lib/server/modules/questionnaires/service/public", () => ({
  publicQuestionnairesService: publicQuestionnairesServiceMock,
}));

import {
  getPublicQuestionnaireAnalysisCacheTag,
  getPublicQuestionnaireResultsPageData,
  PUBLIC_QUESTIONNAIRE_PAGE_CACHE_TAG,
} from "@/lib/public/server/questionnaire-page";
import { ApiError } from "@/lib/server/http/api-error";

const questionnaireId = "00000000-0000-4000-8000-000000000001";

describe("getPublicQuestionnaireResultsPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the results tagged with the shared and the per-questionnaire analysis tag", async () => {
    const analysis = { id: questionnaireId, slug: "questionario", fields: [] };
    publicQuestionnairesServiceMock.getClosedAnalysisBySlug.mockResolvedValue(analysis);

    await expect(getPublicQuestionnaireResultsPageData("questionario")).resolves.toBe(analysis);

    expect(publicQuestionnairesServiceMock.getClosedAnalysisBySlug).toHaveBeenCalledWith(
      "questionario",
    );
    expect(cacheMock.cacheTag).toHaveBeenCalledWith(PUBLIC_QUESTIONNAIRE_PAGE_CACHE_TAG);
    expect(cacheMock.cacheTag).toHaveBeenCalledWith(
      getPublicQuestionnaireAnalysisCacheTag(questionnaireId),
    );
  });

  it("returns null, tagged only with the shared tag, when there are no results", async () => {
    publicQuestionnairesServiceMock.getClosedAnalysisBySlug.mockRejectedValue(
      new ApiError(404, "NOT_FOUND", "Questionnaire results not found"),
    );

    await expect(getPublicQuestionnaireResultsPageData("aperto")).resolves.toBeNull();

    expect(cacheMock.cacheTag).toHaveBeenCalledTimes(1);
    expect(cacheMock.cacheTag).toHaveBeenCalledWith(PUBLIC_QUESTIONNAIRE_PAGE_CACHE_TAG);
  });

  it("propagates unexpected failures instead of caching a missing page", async () => {
    const failure = new Error("database unavailable");
    publicQuestionnairesServiceMock.getClosedAnalysisBySlug.mockRejectedValue(failure);

    await expect(getPublicQuestionnaireResultsPageData("questionario")).rejects.toBe(failure);
  });
});
