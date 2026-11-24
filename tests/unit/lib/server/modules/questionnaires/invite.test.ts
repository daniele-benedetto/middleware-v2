import { publicQuestionnaireInviteDtoSchema } from "@/lib/server/modules/questionnaires/dto/invite";
import { toPublicQuestionnaireInvite } from "@/lib/server/modules/questionnaires/service/invite";

const ids = {
  questionnaire: "00000000-0000-4000-8000-000000000001",
  step: "00000000-0000-4000-8000-000000000002",
  information: "00000000-0000-4000-8000-000000000003",
  text: "00000000-0000-4000-8000-000000000004",
  textarea: "00000000-0000-4000-8000-000000000005",
};

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: ids.questionnaire,
    title: "Questionario aperto",
    titleStyled: null,
    slug: "questionario-aperto",
    descriptionRich: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Raccontaci il turno." }] }],
    },
    homeVariant: "red",
    status: "PUBLISHED",
    definition: {
      version: 1 as const,
      copy: {
        progressLabel: "Avanzamento",
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
            { id: ids.information, type: "information" as const, label: "Premessa" },
            { id: ids.text, type: "text" as const, label: "Reparto", publicResults: false },
            {
              id: ids.textarea,
              type: "textarea" as const,
              label: "Racconto",
              publicResults: false,
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

describe("toPublicQuestionnaireInvite", () => {
  it("maps an open questionnaire to the minimal invite payload", () => {
    const invite = toPublicQuestionnaireInvite(record());

    expect(invite).toEqual({
      id: ids.questionnaire,
      title: "Questionario aperto",
      titleStyled: null,
      slug: "questionario-aperto",
      description: "Raccontaci il turno.",
      homeVariant: "red",
      questionCount: 2,
      estimatedMinutes: 1,
    });
    expect(publicQuestionnaireInviteDtoSchema.safeParse(invite).success).toBe(true);
  });

  it("does not expose the definition or the rich description", () => {
    const invite = toPublicQuestionnaireInvite(record());

    expect(invite).not.toHaveProperty("definition");
    expect(invite).not.toHaveProperty("descriptionRich");
    expect(invite).not.toHaveProperty("status");
  });

  it.each(["DRAFT", "CLOSED", "ARCHIVED"])("hides %s questionnaires", (status) => {
    expect(toPublicQuestionnaireInvite(record({ status }))).toBeNull();
  });

  it("returns a null description when the questionnaire has none", () => {
    expect(toPublicQuestionnaireInvite(record({ descriptionRich: null }))?.description).toBeNull();
  });

  it("falls back to the default variant when none is stored", () => {
    expect(toPublicQuestionnaireInvite(record({ homeVariant: undefined }))?.homeVariant).toBe(
      "black",
    );
  });

  it("skips questionnaires with an invalid stored definition", () => {
    expect(toPublicQuestionnaireInvite(record({ definition: { version: 1 } }))).toBeNull();
  });
});
