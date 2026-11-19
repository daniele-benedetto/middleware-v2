import { QUESTIONNAIRE_OTHER_OPTION_ID } from "@/lib/server/modules/questionnaires/schema/definition";
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
  multiple: "00000000-0000-4000-8000-000000000011",
  url: "00000000-0000-4000-8000-000000000012",
  optionThree: "00000000-0000-4000-8000-000000000013",
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

    expect(analysis).toMatchObject({ id: ids.questionnaire, analysisVersion: 1 });
    expect(analysis).toMatchObject({
      fields: [
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
      ],
    });
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

    expect(analysis).toMatchObject({
      fields: [
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
      ],
    });
  });

  it("uses field respondents for multiple-choice percentages and excludes URLs", () => {
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
                id: ids.multiple,
                type: "multipleChoice",
                label: "Opzioni",
                publicResults: true,
                options: [
                  { id: ids.optionOne, label: "Uno" },
                  { id: ids.optionTwo, label: "Due" },
                  { id: ids.optionThree, label: "Tre" },
                ],
              },
              {
                id: ids.url,
                type: "url",
                label: "URL privato",
                publicResults: true,
              },
            ],
          },
        ],
      },
      responses: [
        {
          answers: {
            [ids.multiple]: [ids.optionOne, ids.optionTwo],
            [ids.url]: "https://one.test",
          },
        },
        { answers: { [ids.multiple]: [ids.optionOne], [ids.url]: "https://two.test" } },
        { answers: { [ids.multiple]: "invalid", [ids.url]: "https://three.test" } },
      ],
    });

    expect(analysis?.fields).toMatchObject([
      {
        id: ids.multiple,
        responseCount: 2,
        missingCount: 0,
        multiple: true,
        options: [
          { id: ids.optionOne, count: 2, percentage: 100, rank: 1 },
          { id: ids.optionTwo, count: 1, percentage: 50, rank: 2 },
          { id: ids.optionThree, count: 0, percentage: 0, rank: 3 },
        ],
      },
    ]);
    expect(JSON.stringify(analysis)).not.toContain("https://");
  });

  describe("choice results order", () => {
    function ordinalRecord(resultsOrder?: "frequency" | "definition") {
      const source = record();
      return {
        ...source,
        definition: {
          ...source.definition,
          steps: [
            {
              id: "00000000-0000-4000-8000-000000000007",
              fields: [
                {
                  id: ids.choice,
                  type: "singleChoice" as const,
                  label: "Quanto spesso?",
                  publicResults: true,
                  ...(resultsOrder ? { resultsOrder } : {}),
                  options: [
                    { id: ids.optionOne, label: "Mai" },
                    { id: ids.optionTwo, label: "A volte" },
                    { id: ids.optionThree, label: "Spesso" },
                  ],
                },
              ],
            },
          ],
        },
        responses: [
          { answers: { [ids.choice]: ids.optionThree } },
          { answers: { [ids.choice]: ids.optionThree } },
          { answers: { [ids.choice]: ids.optionThree } },
          { answers: { [ids.choice]: ids.optionTwo } },
          { answers: { [ids.choice]: ids.optionTwo } },
          { answers: { [ids.choice]: ids.optionOne } },
        ],
      };
    }

    it("sorts options by frequency when the setting is absent", () => {
      const analysis = toPublicQuestionnaireAnalysis(ordinalRecord());

      expect(analysis?.fields).toMatchObject([
        {
          resultsOrder: "frequency",
          options: [
            { label: "Spesso", count: 3, rank: 1 },
            { label: "A volte", count: 2, rank: 2 },
            { label: "Mai", count: 1, rank: 3 },
          ],
        },
      ]);
      expect(toPublicQuestionnaireAnalysis(ordinalRecord("frequency"))?.fields).toEqual(
        analysis?.fields,
      );
    });

    it("keeps the authored order and a frequency rank when set to definition", () => {
      const analysis = toPublicQuestionnaireAnalysis(ordinalRecord("definition"));

      expect(analysis?.fields).toMatchObject([
        {
          resultsOrder: "definition",
          options: [
            { label: "Mai", count: 1, percentage: 16.67, rank: 3 },
            { label: "A volte", count: 2, percentage: 33.33, rank: 2 },
            { label: "Spesso", count: 3, percentage: 50, rank: 1 },
          ],
        },
      ]);
    });
  });
});

describe("toPublicQuestionnaireAnalysis: Altro and conditional fields", () => {
  const detail = "00000000-0000-4000-8000-000000000021";

  function otherRecord(resultsOrder?: "definition") {
    const source = record();
    return {
      ...source,
      definition: {
        ...source.definition,
        steps: [
          {
            id: "00000000-0000-4000-8000-000000000007",
            fields: [
              {
                id: ids.choice,
                type: "singleChoice" as const,
                label: "Scelta",
                publicResults: true,
                allowOther: true,
                otherLabel: "Altro (specificare)",
                ...(resultsOrder ? { resultsOrder } : {}),
                options: [
                  { id: ids.optionOne, label: "Uno" },
                  { id: ids.optionTwo, label: "Due" },
                ],
              },
              {
                id: ids.multiple,
                type: "multipleChoice" as const,
                label: "Multipla",
                publicResults: true,
                allowOther: true,
                options: [{ id: ids.optionThree, label: "Tre" }],
              },
              {
                id: detail,
                type: "scale" as const,
                label: "Solo se Uno",
                publicResults: true,
                min: 1,
                max: 3,
                visibleWhen: {
                  fieldId: ids.choice,
                  operator: "equals" as const,
                  value: ids.optionOne,
                },
              },
            ],
          },
        ],
      },
      responses: [
        {
          answers: {
            [ids.choice]: { other: "Testo riservato" },
            [ids.multiple]: [ids.optionThree],
          },
        },
        {
          answers: {
            [ids.choice]: { other: "Secondo testo" },
            [ids.multiple]: [ids.optionThree, { other: "Quattro" }],
          },
        },
        { answers: { [ids.choice]: ids.optionOne, [detail]: 2 } },
        { answers: {} },
      ],
    };
  }

  it("adds a synthetic Altro option with count, percentage and rank", () => {
    const analysis = toPublicQuestionnaireAnalysis(otherRecord());
    const [choice, multiple] = analysis?.fields ?? [];

    expect(choice).toMatchObject({ kind: "choice", responseCount: 3, missingCount: 1 });
    expect(choice?.kind === "choice" ? choice.options : []).toEqual([
      {
        id: QUESTIONNAIRE_OTHER_OPTION_ID,
        label: "Altro (specificare)",
        count: 2,
        percentage: 66.67,
        rank: 1,
        isOther: true,
      },
      { id: ids.optionOne, label: "Uno", count: 1, percentage: 33.33, rank: 2 },
      { id: ids.optionTwo, label: "Due", count: 0, percentage: 0, rank: 3 },
    ]);
    expect(multiple?.kind === "choice" ? multiple.options : []).toEqual([
      { id: ids.optionThree, label: "Tre", count: 2, percentage: 100, rank: 1 },
      {
        id: QUESTIONNAIRE_OTHER_OPTION_ID,
        label: "Altro",
        count: 1,
        percentage: 50,
        rank: 2,
        isOther: true,
      },
    ]);
  });

  it("keeps Altro last in the authored order", () => {
    const analysis = toPublicQuestionnaireAnalysis(otherRecord("definition"));
    const choice = analysis?.fields[0];

    expect(choice?.kind === "choice" ? choice.options.map((option) => option.id) : []).toEqual([
      ids.optionOne,
      ids.optionTwo,
      QUESTIONNAIRE_OTHER_OPTION_ID,
    ]);
  });

  it("never exposes the free texts", () => {
    const serialized = JSON.stringify(toPublicQuestionnaireAnalysis(otherRecord()));

    expect(serialized).not.toContain("Testo riservato");
    expect(serialized).not.toContain("Quattro");
  });

  it("counts the non-answers of a hidden field as missing", () => {
    const analysis = toPublicQuestionnaireAnalysis(otherRecord());

    expect(analysis?.fields[2]).toMatchObject({ id: detail, responseCount: 1, missingCount: 3 });
  });

  it("adds no Altro option to fields that do not allow it", () => {
    const analysis = toPublicQuestionnaireAnalysis(record());
    const choice = analysis?.fields[0];

    expect(
      choice?.kind === "choice" ? choice.options.map((option) => option.id).sort() : [],
    ).toEqual([ids.optionOne, ids.optionTwo].sort());
    expect(JSON.stringify(choice)).not.toContain("isOther");
  });
});
