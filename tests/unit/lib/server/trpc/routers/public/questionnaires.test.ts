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

  it("strips private values from public aggregate DTOs", async () => {
    questionnaireResponsesServiceMock.getPublicResults.mockResolvedValue([
      {
        kind: "boolean",
        fieldId,
        responseCount: 1,
        trueCount: 1,
        falseCount: 0,
        answers: ["private value"],
      },
    ]);
    const caller = publicQuestionnairesRouter.createCaller(
      context("/api/trpc/public.questionnaires.getResults"),
    );

    const result = await caller.getResults({ questionnaireId });

    expect(result).toEqual([
      { kind: "boolean", fieldId, responseCount: 1, trueCount: 1, falseCount: 0 },
    ]);
    expect(JSON.stringify(result)).not.toContain("private value");
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
