const publicQuestionnairesRepositoryMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
  getClosedAnalysesByIds: vi.fn(),
  getClosedAnalysisBySlug: vi.fn(),
  getOpenInvitesByIds: vi.fn(),
}));

vi.mock("@/lib/server/modules/questionnaires/repository/public", () => ({
  publicQuestionnairesRepository: publicQuestionnairesRepositoryMock,
}));

import { publicQuestionnairesService } from "@/lib/server/modules/questionnaires/service/public";

const ids = {
  questionnaire: "00000000-0000-4000-8000-000000000001",
  step: "00000000-0000-4000-8000-000000000002",
  text: "00000000-0000-4000-8000-000000000003",
  boolean: "00000000-0000-4000-8000-000000000004",
};
const closedAt = new Date("2026-09-08T10:00:00.000Z");

function definition({ publicBoolean = true } = {}) {
  return {
    version: 1 as const,
    copy: {
      progressLabel: "{current}/{total}",
      backLabel: "Indietro",
      nextLabel: "Avanti",
      submitLabel: "Invia",
      requiredFieldsMessage: "Obbligatorio",
      resumeMessage: "Riprendi",
      successTitle: "Grazie",
      successMessage: "Ricevuto",
      alreadySubmittedTitle: "Gia inviato",
      alreadySubmittedMessage: "Hai gia risposto",
      closedTitle: "Chiuso",
      closedMessage: "Non disponibile",
      resultsTitle: "Risultati",
      resultsEmptyMessage: "Vuoto",
    },
    steps: [
      {
        id: ids.step,
        fields: [
          // Free text never has aggregated results, even when flagged as public.
          { id: ids.text, type: "text" as const, label: "Testo", publicResults: true },
          {
            id: ids.boolean,
            type: "boolean" as const,
            label: "Parteciperai?",
            trueLabel: "Si",
            falseLabel: "No",
            publicResults: publicBoolean,
          },
        ],
      },
    ],
  };
}

function questionnaireRecord(
  overrides: Partial<{
    status: "PUBLISHED" | "CLOSED";
    closedAt: Date | null;
    definition: unknown;
  }> = {},
) {
  return {
    id: ids.questionnaire,
    title: "Questionario",
    slug: "questionario",
    descriptionRich: null,
    definition: definition(),
    status: "CLOSED" as const,
    closedAt,
    ...overrides,
  };
}

function analysisRecord(overrides: Partial<{ definition: unknown; closedAt: Date | null }> = {}) {
  return {
    id: ids.questionnaire,
    slug: "questionario",
    title: "Questionario",
    titleStyled: null,
    homeVariant: "black",
    descriptionRich: null,
    closedAt,
    definition: definition(),
    _count: { responses: 3 },
    responses: [
      { answers: { [ids.boolean]: true } },
      { answers: { [ids.boolean]: false } },
      { answers: {} },
    ],
    ...overrides,
  };
}

describe("public questionnaires service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBySlug", () => {
    it("flags public results for a closed questionnaire with an aggregable public field", async () => {
      publicQuestionnairesRepositoryMock.getBySlug.mockResolvedValue(questionnaireRecord());

      await expect(publicQuestionnairesService.getBySlug("questionario")).resolves.toMatchObject({
        slug: "questionario",
        isClosed: true,
        hasPublicResults: true,
      });
    });

    it("does not flag public results while the questionnaire is open", async () => {
      publicQuestionnairesRepositoryMock.getBySlug.mockResolvedValue(
        questionnaireRecord({ status: "PUBLISHED", closedAt: null }),
      );

      await expect(publicQuestionnairesService.getBySlug("questionario")).resolves.toMatchObject({
        isClosed: false,
        hasPublicResults: false,
      });
    });

    it("does not flag public results without an aggregable public field", async () => {
      publicQuestionnairesRepositoryMock.getBySlug.mockResolvedValue(
        questionnaireRecord({ definition: definition({ publicBoolean: false }) }),
      );

      await expect(publicQuestionnairesService.getBySlug("questionario")).resolves.toMatchObject({
        isClosed: true,
        hasPublicResults: false,
      });
    });

    it("does not flag public results without a closing date", async () => {
      publicQuestionnairesRepositoryMock.getBySlug.mockResolvedValue(
        questionnaireRecord({ closedAt: null }),
      );

      await expect(publicQuestionnairesService.getBySlug("questionario")).resolves.toMatchObject({
        hasPublicResults: false,
      });
    });

    it("rejects an unknown slug", async () => {
      publicQuestionnairesRepositoryMock.getBySlug.mockResolvedValue(null);

      await expect(publicQuestionnairesService.getBySlug("missing")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("getClosedAnalysisBySlug", () => {
    it("returns the aggregated results with slug and total responses", async () => {
      publicQuestionnairesRepositoryMock.getClosedAnalysisBySlug.mockResolvedValue(
        analysisRecord(),
      );

      const analysis = await publicQuestionnairesService.getClosedAnalysisBySlug("questionario");

      expect(publicQuestionnairesRepositoryMock.getClosedAnalysisBySlug).toHaveBeenCalledWith(
        "questionario",
      );
      expect(analysis).toMatchObject({
        id: ids.questionnaire,
        slug: "questionario",
        totalResponses: 3,
        closedAt: closedAt.toISOString(),
      });
      expect(analysis.fields).toHaveLength(1);
      expect(analysis.fields[0]).toMatchObject({
        id: ids.boolean,
        responseCount: 2,
        missingCount: 1,
      });
      expect(JSON.stringify(analysis)).not.toContain(ids.text);
    });

    it("rejects a questionnaire that is not closed or does not exist", async () => {
      publicQuestionnairesRepositoryMock.getClosedAnalysisBySlug.mockResolvedValue(null);

      await expect(
        publicQuestionnairesService.getClosedAnalysisBySlug("aperto"),
      ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    });

    it("rejects a closed questionnaire without public-result fields", async () => {
      publicQuestionnairesRepositoryMock.getClosedAnalysisBySlug.mockResolvedValue(
        analysisRecord({ definition: definition({ publicBoolean: false }) }),
      );

      await expect(
        publicQuestionnairesService.getClosedAnalysisBySlug("questionario"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("getClosedAnalysesByIds", () => {
    it("adds the results page slug and drops questionnaires without results", async () => {
      publicQuestionnairesRepositoryMock.getClosedAnalysesByIds.mockResolvedValue([
        analysisRecord(),
        analysisRecord({ definition: definition({ publicBoolean: false }) }),
      ]);

      const analyses = await publicQuestionnairesService.getClosedAnalysesByIds([
        ids.questionnaire,
      ]);

      expect(analyses).toHaveLength(1);
      expect(analyses[0]).toMatchObject({ slug: "questionario", totalResponses: 3 });
    });
  });
});
