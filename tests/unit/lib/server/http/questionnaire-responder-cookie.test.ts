import {
  ensureQuestionnaireResponder,
  hashQuestionnaireResponderToken,
  questionnaireResponderCookie,
} from "@/lib/server/http/questionnaire-responder-cookie";

describe("questionnaire responder cookie", () => {
  beforeEach(() => {
    vi.stubEnv("QUESTIONNAIRE_TOKEN_SECRET", "test-questionnaire-token-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates an HttpOnly responder cookie and returns only its hash", () => {
    const headers = new Headers();
    const responder = ensureQuestionnaireResponder(
      new Request("http://localhost:3000/api/trpc/public.questionnaires.initializeResponder"),
      headers,
    );
    const cookie = headers.get("set-cookie");

    expect(responder.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(cookie).toContain(`${questionnaireResponderCookie.name}=`);
    expect(cookie).toContain("Path=/api/trpc");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain(`Max-Age=${questionnaireResponderCookie.maxAgeSeconds}`);
    expect(cookie).not.toContain("Secure");
  });

  it("reuses a valid existing cookie without issuing another one", () => {
    const token = "a".repeat(43);
    const headers = new Headers();
    const responder = ensureQuestionnaireResponder(
      new Request("http://localhost:3000/api/trpc", {
        headers: { cookie: `${questionnaireResponderCookie.name}=${token}` },
      }),
      headers,
    );

    expect(responder.tokenHash).toBe(hashQuestionnaireResponderToken(token));
    expect(headers.get("set-cookie")).toBeNull();
  });

  it("uses Secure only in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const headers = new Headers();

    ensureQuestionnaireResponder(new Request("https://example.test/api/trpc"), headers);

    expect(headers.get("set-cookie")).toContain("Secure");
  });

  it("fails closed when the hashing secret is unavailable", () => {
    vi.stubEnv("QUESTIONNAIRE_TOKEN_SECRET", "");

    expect(() => hashQuestionnaireResponderToken("a".repeat(43))).toThrow(
      "Questionnaire token secret is not configured",
    );
  });
});
