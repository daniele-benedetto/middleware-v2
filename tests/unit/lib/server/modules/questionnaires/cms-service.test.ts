const repositoryMock = vi.hoisted(() => ({
  cmsQuestionnairesRepository: {
    getById: vi.fn(),
    list: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    transition: vi.fn(),
    delete: vi.fn(),
    getWithResponsesForResults: vi.fn(),
  },
  questionnaireResponsesRepository: {
    listForCms: vi.fn(),
    countForCms: vi.fn(),
    getByIdForCms: vi.fn(),
    getAdjacentIdsForCms: vi.fn(),
  },
}));

vi.mock("@/lib/server/modules/questionnaires/repository", () => repositoryMock);

const revalidationMock = vi.hoisted(() => ({
  revalidatePublicQuestionnaireAnalysisContent: vi.fn(),
  revalidatePublicQuestionnaireInviteContent: vi.fn(),
}));

vi.mock("@/lib/public/server/revalidation", () => revalidationMock);

import {
  questionnaireFieldAnswersDtoSchema,
  questionnaireSummaryDtoSchema,
} from "@/lib/server/modules/questionnaires/dto/summary";
import { cmsQuestionnairesService } from "@/lib/server/modules/questionnaires/service/cms";

const id = "00000000-0000-4000-8000-000000000001";
const fieldId = "00000000-0000-4000-8000-000000000002";
const responseIds = [
  "00000000-0000-4000-8000-000000000011",
  "00000000-0000-4000-8000-000000000012",
  "00000000-0000-4000-8000-000000000013",
  "00000000-0000-4000-8000-000000000014",
];
const definition = {
  version: 1 as const,
  copy: {
    progressLabel: "{current}",
    backLabel: "Indietro",
    nextLabel: "Avanti",
    submitLabel: "Invia",
    requiredFieldsMessage: "Obbligatorio",
    resumeMessage: "Riprendi",
    successTitle: "Ok",
    successMessage: "Ok",
    alreadySubmittedTitle: "Gia",
    alreadySubmittedMessage: "Gia",
    closedTitle: "Chiuso",
    closedMessage: "Chiuso",
    resultsTitle: "Risultati",
    resultsEmptyMessage: "Vuoto",
  },
  steps: [
    {
      id: "00000000-0000-4000-8000-000000000003",
      fields: [
        {
          id: fieldId,
          type: "text" as const,
          label: "Domanda",
          required: true,
          publicResults: false,
        },
      ],
    },
  ],
};
function record(status = "DRAFT", firstResponseAt: Date | null = null) {
  return {
    id,
    title: "Q",
    slug: "q",
    status,
    publishedAt: null,
    closedAt: null,
    firstResponseAt,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { responses: 0 },
    descriptionRich: null,
    definition,
  };
}

describe("cms questionnaires service", () => {
  beforeEach(() => vi.clearAllMocks());
  it("rejects invalid status transitions", async () => {
    repositoryMock.cmsQuestionnairesRepository.getById.mockResolvedValue(record("CLOSED"));
    await expect(cmsQuestionnairesService.transition(id, "publish")).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
  it("allows copy-only updates after the first response", async () => {
    const current = record("PUBLISHED", new Date());
    repositoryMock.cmsQuestionnairesRepository.getById.mockResolvedValue(current);
    repositoryMock.cmsQuestionnairesRepository.update.mockResolvedValue({
      ...current,
      definition: { ...definition, copy: { ...definition.copy, successTitle: "Nuovo" } },
    });
    await expect(
      cmsQuestionnairesService.update(id, {
        definition: { ...definition, copy: { ...definition.copy, successTitle: "Nuovo" } },
      }),
    ).resolves.toMatchObject({ id });
  });
  it("rejects structural updates after the first response", async () => {
    repositoryMock.cmsQuestionnairesRepository.getById.mockResolvedValue(
      record("PUBLISHED", new Date()),
    );
    await expect(
      cmsQuestionnairesService.update(id, { definition: { ...definition, steps: [] } }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("does not expose the responder hash in CMS response detail", async () => {
    repositoryMock.questionnaireResponsesRepository.getByIdForCms.mockResolvedValue({
      id,
      questionnaireId: id,
      schemaVersion: 1,
      definitionSnapshot: definition,
      answers: { [fieldId]: "privata" },
      anonymousTokenHash: "hidden",
      submittedAt: new Date(),
    });
    repositoryMock.questionnaireResponsesRepository.getAdjacentIdsForCms.mockResolvedValue({
      previousId: null,
      nextId: null,
    });
    const result = await cmsQuestionnairesService.getResponseById(id);
    expect(result).not.toHaveProperty("anonymousTokenHash");
  });
  it("returns the previous and next response ids with the response detail", async () => {
    const stored = {
      id: responseIds[1],
      questionnaireId: id,
      schemaVersion: 1,
      definitionSnapshot: definition,
      answers: {},
      submittedAt: new Date("2026-03-10T09:00:00.000Z"),
    };
    repositoryMock.questionnaireResponsesRepository.getByIdForCms.mockResolvedValue(stored);
    repositoryMock.questionnaireResponsesRepository.getAdjacentIdsForCms.mockResolvedValue({
      previousId: responseIds[0],
      nextId: responseIds[2],
    });

    const result = await cmsQuestionnairesService.getResponseById(responseIds[1], id);

    expect(result).toMatchObject({
      previousResponseId: responseIds[0],
      nextResponseId: responseIds[2],
    });
    expect(
      repositoryMock.questionnaireResponsesRepository.getAdjacentIdsForCms,
    ).toHaveBeenCalledWith(stored);
  });
  it("does not look up adjacent responses for a missing response", async () => {
    repositoryMock.questionnaireResponsesRepository.getByIdForCms.mockResolvedValue(null);
    await expect(cmsQuestionnairesService.getResponseById(id, id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(
      repositoryMock.questionnaireResponsesRepository.getAdjacentIdsForCms,
    ).not.toHaveBeenCalled();
  });
  it("lists responses with raw answers and passes the submittedAt range to both queries", async () => {
    repositoryMock.questionnaireResponsesRepository.listForCms.mockResolvedValue([
      {
        id: responseIds[0],
        questionnaireId: id,
        schemaVersion: 1,
        answers: { [fieldId]: "Risposta" },
        submittedAt: new Date("2026-03-10T09:00:00.000Z"),
      },
    ]);
    repositoryMock.questionnaireResponsesRepository.countForCms.mockResolvedValue(1);
    const pagination = { page: 1, pageSize: 20 };

    const result = await cmsQuestionnairesService.listResponses(
      id,
      { submittedFrom: "2026-03-10T00:00:00+01:00", submittedTo: "2026-03-10T23:59:59.999+01:00" },
      pagination,
    );

    const range = {
      submittedFrom: new Date("2026-03-09T23:00:00.000Z"),
      submittedTo: new Date("2026-03-10T22:59:59.999Z"),
    };
    expect(repositoryMock.questionnaireResponsesRepository.listForCms).toHaveBeenCalledWith(
      id,
      range,
      pagination,
    );
    expect(repositoryMock.questionnaireResponsesRepository.countForCms).toHaveBeenCalledWith(
      id,
      range,
    );
    expect(result).toEqual({
      items: [
        {
          id: responseIds[0],
          questionnaireId: id,
          schemaVersion: 1,
          answers: { [fieldId]: "Risposta" },
          submittedAt: "2026-03-10T09:00:00.000Z",
        },
      ],
      total: 1,
    });
  });
  it("lists responses without a range when no filter is given", async () => {
    repositoryMock.questionnaireResponsesRepository.listForCms.mockResolvedValue([]);
    repositoryMock.questionnaireResponsesRepository.countForCms.mockResolvedValue(0);
    await cmsQuestionnairesService.listResponses(id, {}, { page: 1, pageSize: 20 });
    expect(repositoryMock.questionnaireResponsesRepository.countForCms).toHaveBeenCalledWith(id, {
      submittedFrom: undefined,
      submittedTo: undefined,
    });
  });

  describe("results", () => {
    function response(index: number, submittedAt: string, answer?: unknown) {
      return {
        id: responseIds[index],
        submittedAt: new Date(submittedAt),
        answers: answer === undefined ? {} : { [fieldId]: answer },
      };
    }
    function results(status: string, responses: ReturnType<typeof response>[]) {
      return {
        id,
        status,
        publishedAt: new Date("2026-03-01T08:00:00.000Z"),
        closedAt: null,
        definition,
        responses,
      };
    }

    it("summarizes a published questionnaire with a single repository query", async () => {
      repositoryMock.cmsQuestionnairesRepository.getWithResponsesForResults.mockResolvedValue(
        results("PUBLISHED", [
          response(0, "2026-03-10T09:00:00.000Z", "Prima"),
          response(1, "2026-03-12T09:00:00.000Z"),
        ]),
      );

      const summary = await cmsQuestionnairesService.getSummary(id);

      expect(summary).toMatchObject({
        id,
        status: "PUBLISHED",
        publishedAt: "2026-03-01T08:00:00.000Z",
        closedAt: null,
        responseCount: 2,
        firstResponseAt: "2026-03-10T09:00:00.000Z",
        lastResponseAt: "2026-03-12T09:00:00.000Z",
        timeline: {
          timezone: "Europe/Rome",
          days: [
            { date: "2026-03-10", count: 1, cumulative: 1 },
            { date: "2026-03-11", count: 0, cumulative: 1 },
            { date: "2026-03-12", count: 1, cumulative: 2 },
          ],
        },
        fields: [
          {
            id: fieldId,
            type: "text",
            publicResults: false,
            answeredCount: 1,
            missingCount: 1,
            result: { kind: "text" },
          },
        ],
      });
      expect(() => questionnaireSummaryDtoSchema.parse(summary)).not.toThrow();
      expect(
        repositoryMock.cmsQuestionnairesRepository.getWithResponsesForResults,
      ).toHaveBeenCalledTimes(1);
      expect(repositoryMock.cmsQuestionnairesRepository.getById).not.toHaveBeenCalled();
    });
    it("returns an empty summary for a questionnaire without responses", async () => {
      repositoryMock.cmsQuestionnairesRepository.getWithResponsesForResults.mockResolvedValue(
        results("DRAFT", []),
      );
      const summary = await cmsQuestionnairesService.getSummary(id);
      expect(summary).toMatchObject({
        status: "DRAFT",
        responseCount: 0,
        firstResponseAt: null,
        lastResponseAt: null,
        timeline: { days: [] },
        fields: [{ id: fieldId, answeredCount: 0, missingCount: 0 }],
      });
      expect(() => questionnaireSummaryDtoSchema.parse(summary)).not.toThrow();
    });
    it("rejects the summary of an unknown questionnaire", async () => {
      repositoryMock.cmsQuestionnairesRepository.getWithResponsesForResults.mockResolvedValue(null);
      await expect(cmsQuestionnairesService.getSummary(id)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
    it("pages the non-empty answers of a free-text field, newest first", async () => {
      repositoryMock.cmsQuestionnairesRepository.getWithResponsesForResults.mockResolvedValue(
        results("CLOSED", [
          response(0, "2026-03-10T09:00:00.000Z", "Prima"),
          response(1, "2026-03-11T09:00:00.000Z"),
          response(2, "2026-03-12T09:00:00.000Z", "Terza"),
          response(3, "2026-03-13T09:00:00.000Z", "Quarta"),
        ]),
      );

      const firstPage = await cmsQuestionnairesService.listFieldAnswers(id, fieldId, {
        page: 1,
        pageSize: 2,
      });
      const secondPage = await cmsQuestionnairesService.listFieldAnswers(id, fieldId, {
        page: 2,
        pageSize: 2,
      });

      expect(firstPage).toEqual({
        field: { id: fieldId, type: "text", label: "Domanda", stepTitle: null },
        items: [
          { responseId: responseIds[3], submittedAt: "2026-03-13T09:00:00.000Z", value: "Quarta" },
          { responseId: responseIds[2], submittedAt: "2026-03-12T09:00:00.000Z", value: "Terza" },
        ],
        total: 3,
      });
      expect(secondPage.items).toEqual([
        { responseId: responseIds[0], submittedAt: "2026-03-10T09:00:00.000Z", value: "Prima" },
      ]);
      expect(() => questionnaireFieldAnswersDtoSchema.parse(firstPage)).not.toThrow();
    });
    it("rejects field answers for unknown or non free-text fields", async () => {
      const source = results("CLOSED", []);
      repositoryMock.cmsQuestionnairesRepository.getWithResponsesForResults.mockResolvedValue(
        source,
      );
      await expect(
        cmsQuestionnairesService.listFieldAnswers(id, responseIds[0], { page: 1, pageSize: 20 }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      repositoryMock.cmsQuestionnairesRepository.getWithResponsesForResults.mockResolvedValue({
        ...source,
        definition: {
          ...definition,
          steps: [
            {
              ...definition.steps[0],
              fields: [
                {
                  id: fieldId,
                  type: "boolean" as const,
                  label: "Si o no",
                  trueLabel: "Si",
                  falseLabel: "No",
                },
              ],
            },
          ],
        },
      });
      await expect(
        cmsQuestionnairesService.listFieldAnswers(id, fieldId, { page: 1, pageSize: 20 }),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });
  it("refreshes the home invite when an open questionnaire is updated", async () => {
    const current = record("PUBLISHED");
    repositoryMock.cmsQuestionnairesRepository.getById.mockResolvedValue(current);
    repositoryMock.cmsQuestionnairesRepository.update.mockResolvedValue({ ...current, title: "N" });
    await cmsQuestionnairesService.update(id, { title: "N" });
    expect(revalidationMock.revalidatePublicQuestionnaireInviteContent).toHaveBeenCalledWith(id);
  });
  it("does not refresh the home invite when a draft is updated", async () => {
    const current = record("DRAFT");
    repositoryMock.cmsQuestionnairesRepository.getById.mockResolvedValue(current);
    repositoryMock.cmsQuestionnairesRepository.update.mockResolvedValue({ ...current, title: "N" });
    await cmsQuestionnairesService.update(id, { title: "N" });
    expect(revalidationMock.revalidatePublicQuestionnaireInviteContent).not.toHaveBeenCalled();
  });
  it.each([
    ["publish", "DRAFT", "PUBLISHED"],
    ["close", "PUBLISHED", "CLOSED"],
    ["archive", "PUBLISHED", "ARCHIVED"],
  ] as const)("refreshes the home invite on %s", async (action, from, to) => {
    repositoryMock.cmsQuestionnairesRepository.getById.mockResolvedValue(record(from));
    repositoryMock.cmsQuestionnairesRepository.transition.mockResolvedValue(record(to));
    await cmsQuestionnairesService.transition(id, action);
    expect(revalidationMock.revalidatePublicQuestionnaireInviteContent).toHaveBeenCalledWith(id);
  });
  it("refreshes the home invite when a questionnaire is deleted", async () => {
    repositoryMock.cmsQuestionnairesRepository.delete.mockResolvedValue(undefined);
    await cmsQuestionnairesService.delete(id);
    expect(revalidationMock.revalidatePublicQuestionnaireInviteContent).toHaveBeenCalledWith(id);
  });
});
