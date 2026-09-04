const repositoryMock = vi.hoisted(() => ({
  cmsQuestionnairesRepository: {
    getById: vi.fn(),
    list: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    transition: vi.fn(),
    delete: vi.fn(),
  },
  questionnaireResponsesRepository: {
    listForCms: vi.fn(),
    countForCms: vi.fn(),
    getByIdForCms: vi.fn(),
  },
}));

vi.mock("@/lib/server/modules/questionnaires/repository", () => repositoryMock);

import { cmsQuestionnairesService } from "@/lib/server/modules/questionnaires/service/cms";

const id = "00000000-0000-4000-8000-000000000001";
const fieldId = "00000000-0000-4000-8000-000000000002";
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
      fields: [{ id: fieldId, type: "text" as const, label: "Domanda" }],
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
    const result = await cmsQuestionnairesService.getResponseById(id);
    expect(result).not.toHaveProperty("anonymousTokenHash");
  });
});
