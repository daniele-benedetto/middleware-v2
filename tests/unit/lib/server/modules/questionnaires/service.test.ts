const questionnairesRepositoryMock = vi.hoisted(() => ({
  getById: vi.fn(),
  getForAggregation: vi.fn(),
  withQuestionnaireForSubmission: vi.fn(),
}));
const questionnaireResponsesRepositoryMock = vi.hoisted(() => ({
  listByQuestionnaireId: vi.fn(),
}));

vi.mock("@/lib/server/modules/questionnaires/repository", () => ({
  questionnairesRepository: questionnairesRepositoryMock,
  questionnaireResponsesRepository: questionnaireResponsesRepositoryMock,
}));

import {
  createQuestionnaireResponsesService,
  type QuestionnaireResponseServiceRepositories,
} from "@/lib/server/modules/questionnaires/service";
import { createPrismaKnownRequestError } from "@/tests/helpers/create-prisma-known-request-error";

const ids = {
  questionnaire: "00000000-0000-4000-8000-000000000001",
  text: "00000000-0000-4000-8000-000000000002",
  boolean: "00000000-0000-4000-8000-000000000003",
  choice: "00000000-0000-4000-8000-000000000004",
  optionOne: "00000000-0000-4000-8000-000000000005",
  optionTwo: "00000000-0000-4000-8000-000000000006",
  response: "00000000-0000-4000-8000-000000000007",
};

function definition() {
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
        id: "00000000-0000-4000-8000-000000000008",
        fields: [
          { id: ids.text, type: "text" as const, label: "Risposta privata", required: true },
          {
            id: ids.boolean,
            type: "boolean" as const,
            label: "Parteciperai?",
            trueLabel: "Si",
            falseLabel: "No",
            required: true,
            publicResults: true,
          },
          {
            id: ids.choice,
            type: "singleChoice" as const,
            label: "Scelta",
            publicResults: true,
            options: [
              { id: ids.optionOne, label: "Uno" },
              { id: ids.optionTwo, label: "Due" },
            ],
          },
        ],
      },
    ],
  };
}

function questionnaire(status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED" = "PUBLISHED"): {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  definition: ReturnType<typeof definition>;
  firstResponseAt: Date | null;
} {
  return {
    id: ids.questionnaire,
    status,
    definition: definition(),
    firstResponseAt: null,
  };
}

function repositories(
  record = questionnaire(),
  responseRecords: Array<{
    id: string;
    questionnaireId: string;
    schemaVersion: number;
    definitionSnapshot: unknown;
    anonymousTokenHash: string;
    answers: unknown;
    submittedAt: Date;
  }> = [],
) {
  const createResponse = vi.fn(async (input) => ({
    id: ids.response,
    questionnaireId: input.questionnaireId,
    schemaVersion: input.schemaVersion,
    definitionSnapshot: input.definitionSnapshot,
    anonymousTokenHash: input.anonymousTokenHash,
    answers: input.answers,
    submittedAt: new Date("2026-09-04T10:00:00.000Z"),
  }));
  const setFirstResponseAt = vi.fn(async () => undefined);

  const value: QuestionnaireResponseServiceRepositories = {
    getById: vi.fn(async () => record),
    getForAggregation: vi.fn(async () => record),
    withQuestionnaireForSubmission: async (_questionnaireId, operation) =>
      operation(record, { createResponse, setFirstResponseAt }),
    listByQuestionnaireId: vi.fn(async () => responseRecords),
  };

  return { value, createResponse, setFirstResponseAt };
}

describe("questionnaire responses service", () => {
  it("submits a response atomically with the parsed definition snapshot", async () => {
    const mock = repositories();
    const service = createQuestionnaireResponsesService(mock.value);

    const result = await service.submit({
      questionnaireId: ids.questionnaire,
      anonymousTokenHash: "hashed-token",
      answers: { [ids.text]: "Ada", [ids.boolean]: false, [ids.choice]: ids.optionTwo },
    });

    expect(result).toEqual({
      id: ids.response,
      questionnaireId: ids.questionnaire,
      submittedAt: "2026-09-04T10:00:00.000Z",
    });
    expect(mock.createResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        questionnaireId: ids.questionnaire,
        schemaVersion: 1,
        anonymousTokenHash: "hashed-token",
        answers: expect.objectContaining({ [ids.boolean]: false }),
      }),
    );
    expect(mock.setFirstResponseAt).toHaveBeenCalledWith(ids.questionnaire);
  });

  it("rejects submissions to a closed questionnaire", async () => {
    const mock = repositories(questionnaire("CLOSED"));
    const service = createQuestionnaireResponsesService(mock.value);

    await expect(
      service.submit({
        questionnaireId: ids.questionnaire,
        anonymousTokenHash: "hash",
        answers: {},
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    expect(mock.createResponse).not.toHaveBeenCalled();
  });

  it("maps duplicate token conflicts to an already-submitted conflict", async () => {
    const mock = repositories();
    mock.value.withQuestionnaireForSubmission = async () => {
      throw createPrismaKnownRequestError("P2002");
    };
    const service = createQuestionnaireResponsesService(mock.value);

    await expect(
      service.submit({
        questionnaireId: ids.questionnaire,
        anonymousTokenHash: "hash",
        answers: {},
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
  });

  it("locks structural changes after the first response", async () => {
    const mock = repositories({ ...questionnaire(), firstResponseAt: new Date("2026-09-04") });
    const service = createQuestionnaireResponsesService(mock.value);

    await expect(service.assertDefinitionCanChange(ids.questionnaire)).rejects.toMatchObject({
      code: "CONFLICT",
      status: 409,
    });
  });

  it("returns only public aggregates after closure", async () => {
    const mock = repositories(questionnaire("CLOSED"), [
      {
        id: ids.response,
        questionnaireId: ids.questionnaire,
        schemaVersion: 1,
        definitionSnapshot: definition(),
        anonymousTokenHash: "one",
        answers: {
          [ids.text]: "Risposta privata",
          [ids.boolean]: false,
          [ids.choice]: ids.optionOne,
        },
        submittedAt: new Date("2026-09-04T10:00:00.000Z"),
      },
    ]);
    const service = createQuestionnaireResponsesService(mock.value);

    const results = await service.getPublicResults(ids.questionnaire);

    expect(results).toEqual([
      { kind: "boolean", fieldId: ids.boolean, responseCount: 1, trueCount: 0, falseCount: 1 },
      {
        kind: "choice",
        fieldId: ids.choice,
        responseCount: 1,
        options: [
          { optionId: ids.optionOne, count: 1 },
          { optionId: ids.optionTwo, count: 0 },
        ],
      },
    ]);
    expect(JSON.stringify(results)).not.toContain("Risposta privata");
  });

  it("does not expose results before the questionnaire is closed", async () => {
    const mock = repositories(questionnaire("PUBLISHED"));
    const service = createQuestionnaireResponsesService(mock.value);

    await expect(service.getPublicResults(ids.questionnaire)).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });
});
