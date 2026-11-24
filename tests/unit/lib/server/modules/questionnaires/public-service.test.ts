const publicQuestionnairesRepositoryMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
  getClosedAnalysesByIds: vi.fn(),
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
    title: "Questionario",
    titleStyled: null,
    homeVariant: "black",
    descriptionRich: null,
    closedAt,
    definition: definition(),
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
    it("returns a closed questionnaire as closed", async () => {
      publicQuestionnairesRepositoryMock.getBySlug.mockResolvedValue(questionnaireRecord());

      const questionnaire = await publicQuestionnairesService.getBySlug("questionario");

      expect(questionnaire).toMatchObject({ slug: "questionario", isClosed: true });
      expect(questionnaire).not.toHaveProperty("hasPublicResults");
    });

    it("returns an open questionnaire as not closed", async () => {
      publicQuestionnairesRepositoryMock.getBySlug.mockResolvedValue(
        questionnaireRecord({ status: "PUBLISHED", closedAt: null }),
      );

      await expect(publicQuestionnairesService.getBySlug("questionario")).resolves.toMatchObject({
        isClosed: false,
      });
    });

    it("rejects an unknown slug", async () => {
      publicQuestionnairesRepositoryMock.getBySlug.mockResolvedValue(null);

      await expect(publicQuestionnairesService.getBySlug("missing")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("getClosedAnalysesByIds", () => {
    it("aggregates the public fields and drops questionnaires without results", async () => {
      publicQuestionnairesRepositoryMock.getClosedAnalysesByIds.mockResolvedValue([
        analysisRecord(),
        analysisRecord({ definition: definition({ publicBoolean: false }) }),
      ]);

      const analyses = await publicQuestionnairesService.getClosedAnalysesByIds([
        ids.questionnaire,
      ]);

      expect(analyses).toHaveLength(1);
      const [analysis] = analyses;
      expect(analysis).toMatchObject({ id: ids.questionnaire, closedAt: closedAt.toISOString() });
      expect(analysis).not.toHaveProperty("slug");
      expect(analysis).not.toHaveProperty("totalResponses");
      expect(analysis?.fields).toHaveLength(1);
      expect(analysis?.fields[0]).toMatchObject({
        id: ids.boolean,
        hasResponses: true,
        truePercentage: 50,
        falsePercentage: 50,
      });
      expect(JSON.stringify(analysis)).not.toMatch(
        /"(responseCount|missingCount|trueCount|falseCount)"/,
      );
      expect(JSON.stringify(analysis)).not.toContain(ids.text);
    });
  });
});
