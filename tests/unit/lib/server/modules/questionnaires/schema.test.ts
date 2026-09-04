import {
  createQuestionnaireAnswersSchema,
  createQuestionnaireInputSchema,
  questionnaireDefinitionSchema,
} from "@/lib/server/modules/questionnaires/schema";

const ids = {
  step: "00000000-0000-4000-8000-000000000001",
  text: "00000000-0000-4000-8000-000000000002",
  boolean: "00000000-0000-4000-8000-000000000003",
  choice: "00000000-0000-4000-8000-000000000004",
  optionOne: "00000000-0000-4000-8000-000000000005",
  optionTwo: "00000000-0000-4000-8000-000000000006",
  information: "00000000-0000-4000-8000-000000000007",
};

function definition() {
  return {
    version: 1 as const,
    copy: {
      progressLabel: "Passaggio {current} di {total}",
      backLabel: "Indietro",
      nextLabel: "Continua",
      submitLabel: "Invia",
      requiredFieldsMessage: "Completa i campi obbligatori",
      resumeMessage: "Riprendiamo da dove eri rimasto",
      successTitle: "Grazie",
      successMessage: "Risposte registrate",
      alreadySubmittedTitle: "Hai gia risposto",
      alreadySubmittedMessage: "Non puoi inviare una seconda risposta",
      closedTitle: "Questionario chiuso",
      closedMessage: "Non accetta piu risposte",
      resultsTitle: "Risultati",
      resultsEmptyMessage: "Non ci sono risultati",
    },
    steps: [
      {
        id: ids.step,
        fields: [
          { id: ids.text, type: "text" as const, label: "Nome", required: true, minLength: 2 },
          {
            id: ids.boolean,
            type: "boolean" as const,
            label: "Parteciperai?",
            required: true,
            trueLabel: "Si",
            falseLabel: "No",
          },
          {
            id: ids.choice,
            type: "singleChoice" as const,
            label: "Colore",
            required: true,
            options: [
              { id: ids.optionOne, label: "Rosso" },
              { id: ids.optionTwo, label: "Blu" },
            ],
          },
          { id: ids.information, type: "information" as const, label: "Informazione" },
        ],
      },
    ],
  };
}

describe("questionnaire schemas", () => {
  it("keeps all public copy editable in the definition", () => {
    const parsed = questionnaireDefinitionSchema.parse({
      ...definition(),
      copy: { ...definition().copy, successTitle: "Questionario ricevuto" },
    });

    expect(parsed.copy.successTitle).toBe("Questionario ricevuto");
  });

  it("rejects duplicate field ids across steps", () => {
    const input = definition();
    input.steps.push({
      id: "00000000-0000-4000-8000-000000000008",
      fields: [{ id: ids.text, type: "information", label: "Duplicato" }],
    });

    expect(questionnaireDefinitionSchema.safeParse(input).success).toBe(false);
  });

  it("rejects duplicate choice option ids", () => {
    const input = definition();
    const choice = input.steps[0]?.fields[2];
    if (choice?.type === "singleChoice") {
      choice.options[1] = { id: ids.optionOne, label: "Duplicata" };
    }

    expect(questionnaireDefinitionSchema.safeParse(input).success).toBe(false);
  });

  it("validates answers against the definition and accepts false for required booleans", () => {
    const parsedDefinition = questionnaireDefinitionSchema.parse(definition());
    const answersSchema = createQuestionnaireAnswersSchema(parsedDefinition);

    expect(
      answersSchema.safeParse({
        [ids.text]: "Ada",
        [ids.boolean]: false,
        [ids.choice]: ids.optionTwo,
      }).success,
    ).toBe(true);
  });

  it("rejects required answers that are missing and unknown fields", () => {
    const parsedDefinition = questionnaireDefinitionSchema.parse(definition());
    const answersSchema = createQuestionnaireAnswersSchema(parsedDefinition);

    expect(
      answersSchema.safeParse({ [ids.boolean]: false, [ids.choice]: ids.optionOne }).success,
    ).toBe(false);
    expect(
      answersSchema.safeParse({
        [ids.text]: "Ada",
        [ids.boolean]: false,
        [ids.choice]: ids.optionOne,
        "00000000-0000-4000-8000-000000000099": "non ammesso",
      }).success,
    ).toBe(false);
  });

  it("applies draft as the default questionnaire status", () => {
    const parsed = createQuestionnaireInputSchema.parse({
      title: "  Ricerca  ",
      slug: "ricerca",
      definition: definition(),
    });

    expect(parsed.title).toBe("Ricerca");
    expect(parsed.status).toBe("DRAFT");
  });
});
