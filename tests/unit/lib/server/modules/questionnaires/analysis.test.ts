import { toPublicQuestionnaireAnalysis } from "@/lib/server/modules/questionnaires/service/analysis";

const ids = {
  questionnaire: "00000000-0000-4000-8000-000000000001",
  choice: "00000000-0000-4000-8000-000000000002",
  optionOne: "00000000-0000-4000-8000-000000000003",
  optionTwo: "00000000-0000-4000-8000-000000000004",
  text: "00000000-0000-4000-8000-000000000005",
  scale: "00000000-0000-4000-8000-000000000006",
};

function record() {
  return {
    id: ids.questionnaire,
    title: "Questionario chiuso",
    descriptionRich: null,
    closedAt: new Date("2026-09-08T10:00:00.000Z"),
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
          id: "00000000-0000-4000-8000-000000000007",
          fields: [
            {
              id: ids.choice,
              type: "singleChoice" as const,
              label: "Scelta pubblica",
              publicResults: true,
              options: [
                { id: ids.optionOne, label: "Uno" },
                { id: ids.optionTwo, label: "Due" },
              ],
            },
            {
              id: ids.text,
              type: "textarea" as const,
              label: "Testo privato",
              publicResults: true,
            },
            {
              id: ids.scale,
              type: "scale" as const,
              label: "Scala pubblica",
              publicResults: true,
              min: 1,
              max: 3,
            },
          ],
        },
      ],
    },
    _count: { responses: 2 },
    responses: [
      { answers: { [ids.choice]: ids.optionOne, [ids.text]: "Dato sensibile", [ids.scale]: 1 } },
      { answers: { [ids.choice]: ids.optionTwo, [ids.text]: "Altro dato", [ids.scale]: 3 } },
    ],
  };
}

describe("toPublicQuestionnaireAnalysis", () => {
  it("returns only aggregate data for supported public fields", () => {
    const analysis = toPublicQuestionnaireAnalysis(record());

    expect(analysis).toMatchObject({ id: ids.questionnaire, responseCount: 2 });
    expect(analysis?.fields).toEqual([
      {
        id: ids.choice,
        label: "Scelta pubblica",
        description: null,
        kind: "choice",
        responseCount: 2,
        multiple: false,
        options: [
          { label: "Uno", count: 1, percentage: 50 },
          { label: "Due", count: 1, percentage: 50 },
        ],
      },
      {
        id: ids.scale,
        label: "Scala pubblica",
        description: null,
        kind: "number",
        responseCount: 2,
        minimum: 1,
        maximum: 3,
        average: 2,
        distribution: [
          { value: 1, count: 1 },
          { value: 2, count: 0 },
          { value: 3, count: 1 },
        ],
      },
    ]);
    expect(JSON.stringify(analysis)).not.toContain("Dato sensibile");
  });
});
