const publicQuestionnairesServiceMock = vi.hoisted(() => ({
  getBySlug: vi.fn(),
}));
const questionnaireResponsesServiceMock = vi.hoisted(() => ({
  getPublicResults: vi.fn(),
  submit: vi.fn(),
}));

vi.mock("@/lib/server/modules/questionnaires/service/public", () => ({
  publicQuestionnairesService: publicQuestionnairesServiceMock,
}));
vi.mock("@/lib/server/modules/questionnaires/service", () => ({
  questionnaireResponsesService: questionnaireResponsesServiceMock,
}));

import { ApiError } from "@/lib/server/http/api-error";
import { publicQuestionnairesRouter } from "@/lib/server/trpc/routers/public/questionnaires";

const questionnaireId = "00000000-0000-4000-8000-000000000001";
const fieldId = "00000000-0000-4000-8000-000000000002";

function context(path = "/api/trpc/public.questionnaires.initializeResponder") {
  return {
    request: new Request(`http://localhost:3000${path}`, {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    }),
    responseHeaders: new Headers(),
    session: null,
  };
}

describe("public questionnaires router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("QUESTIONNAIRE_TOKEN_SECRET", "test-questionnaire-token-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("initializes the anonymous responder through the response headers", async () => {
    const ctx = context();
    const caller = publicQuestionnairesRouter.createCaller(ctx);

    await expect(caller.initializeResponder()).resolves.toEqual({ initialized: true });
    expect(ctx.responseHeaders.get("set-cookie")).toContain("mw_questionnaire_responder=");
  });

  it("exposes whether a questionnaire has a public results page", async () => {
    publicQuestionnairesServiceMock.getBySlug.mockResolvedValue({
      id: questionnaireId,
      title: "Questionario",
      slug: "questionario",
      descriptionRich: null,
      definition: {
        version: 1,
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
            id: "00000000-0000-4000-8000-000000000004",
            fields: [
              {
                id: fieldId,
                type: "boolean",
                label: "Parteciperai?",
                trueLabel: "Si",
                falseLabel: "No",
                publicResults: true,
              },
            ],
          },
        ],
      },
      isClosed: true,
      hasPublicResults: true,
    });
    const caller = publicQuestionnairesRouter.createCaller(
      context("/api/trpc/public.questionnaires.getBySlug"),
    );

    await expect(caller.getBySlug({ slug: "questionario" })).resolves.toMatchObject({
      slug: "questionario",
      isClosed: true,
      hasPublicResults: true,
    });
  });

  it("submits using the cookie hash and exposes only the minimal result", async () => {
    questionnaireResponsesServiceMock.submit.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000003",
      questionnaireId,
      submittedAt: "2026-09-04T10:00:00.000Z",
      answers: { private: "must not escape" },
    });
    const ctx = context("/api/trpc/public.questionnaires.submit");
    const caller = publicQuestionnairesRouter.createCaller(ctx);

    const result = await caller.submit({ questionnaireId, answers: { [fieldId]: false } });

    expect(questionnaireResponsesServiceMock.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        questionnaireId,
        answers: { [fieldId]: false },
        anonymousTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(result).toEqual({
      id: "00000000-0000-4000-8000-000000000003",
      questionnaireId,
      submittedAt: "2026-09-04T10:00:00.000Z",
    });
  });

  it("preserves a duplicate-response conflict for the public client", async () => {
    questionnaireResponsesServiceMock.submit.mockRejectedValue(
      new ApiError(409, "CONFLICT", "A response has already been submitted"),
    );
    const caller = publicQuestionnairesRouter.createCaller(
      context("/api/trpc/public.questionnaires.submit"),
    );

    await expect(caller.submit({ questionnaireId, answers: {} })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "A response has already been submitted",
    });
  });

  it("rejects cross-origin public mutations", async () => {
    const ctx = {
      ...context(),
      request: new Request(
        "http://localhost:3000/api/trpc/public.questionnaires.initializeResponder",
        {
          method: "POST",
          headers: { origin: "https://attacker.example" },
        },
      ),
    };
    const caller = publicQuestionnairesRouter.createCaller(ctx);

    await expect(caller.initializeResponder()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
