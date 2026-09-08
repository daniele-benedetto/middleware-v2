import { toPublicQuestionnaireAnalysis } from "@/lib/server/modules/questionnaires/service/analysis";

const ids = {
  questionnaire: "00000000-0000-4000-8000-000000000001",
  choice: "00000000-0000-4000-8000-000000000002",
  optionOne: "00000000-0000-4000-8000-000000000003",
  optionTwo: "00000000-0000-4000-8000-000000000004",
  text: "00000000-0000-4000-8000-000000000005",
  scale: "00000000-0000-4000-8000-000000000006",
  decimal: "00000000-0000-4000-8000-000000000008",
  date: "00000000-0000-4000-8000-000000000009",
  boolean: "00000000-0000-4000-8000-000000000010",
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
        discrete: true,
        distribution: [
          { minimum: 1, maximum: 1, count: 1 },
          { minimum: 2, maximum: 2, count: 0 },
          { minimum: 3, maximum: 3, count: 1 },
        ],
      },
    ]);
    expect(JSON.stringify(analysis)).not.toContain("Dato sensibile");
  });

  it("creates safe histogram and temporal aggregates", () => {
    const source = record();
    const analysis = toPublicQuestionnaireAnalysis({
      ...source,
      definition: {
        ...source.definition,
        steps: [
          {
            id: "00000000-0000-4000-8000-000000000007",
            fields: [
              {
                id: ids.decimal,
                type: "decimal",
                label: "Valore pubblico",
                publicResults: true,
              },
              {
                id: ids.date,
                type: "date",
                label: "Data pubblica",
                publicResults: true,
              },
              {
                id: ids.boolean,
                type: "boolean",
                label: "Risposta pubblica",
                publicResults: true,
                trueLabel: "Si",
                falseLabel: "No",
              },
            ],
          },
        ],
      },
      responses: [
        {
          answers: {
            [ids.decimal]: 1.1,
            [ids.date]: "2026-01-01",
            [ids.boolean]: true,
          },
        },
        {
          answers: {
            [ids.decimal]: 1.2,
            [ids.date]: "2026-01-03",
            [ids.boolean]: false,
          },
        },
        {
          answers: {
            [ids.decimal]: 1.3,
            [ids.date]: "2026-01-05",
            [ids.boolean]: true,
          },
        },
        {
          answers: {
            [ids.decimal]: 1.4,
            [ids.date]: "2026-01-07",
            [ids.boolean]: true,
          },
        },
      ],
    });

    expect(analysis?.fields).toEqual([
      {
        id: ids.decimal,
        label: "Valore pubblico",
        description: null,
        kind: "number",
        responseCount: 4,
        minimum: 1.1,
        maximum: 1.4,
        average: 1.25,
        discrete: false,
        distribution: [
          { minimum: 1.1, maximum: 1.25, count: 2 },
          { minimum: 1.25, maximum: 1.4, count: 2 },
        ],
      },
      {
        id: ids.date,
        label: "Data pubblica",
        description: null,
        kind: "date",
        responseCount: 4,
        minimum: "2026-01-01",
        maximum: "2026-01-07",
        distribution: [
          { date: "2026-01-01", count: 1 },
          { date: "2026-01-03", count: 1 },
          { date: "2026-01-05", count: 1 },
          { date: "2026-01-07", count: 1 },
        ],
      },
      {
        id: ids.boolean,
        label: "Risposta pubblica",
        description: null,
        kind: "boolean",
        responseCount: 4,
        trueLabel: "Si",
        falseLabel: "No",
        trueCount: 3,
        falseCount: 1,
      },
    ]);
  });
});
