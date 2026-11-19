import {
  questionnaireDefinitionSchema,
  listQuestionnaireResponsesFilterSchema,
} from "@/lib/server/modules/questionnaires/schema";
import { toPublicQuestionnaireAnalysis } from "@/lib/server/modules/questionnaires/service/analysis";
import {
  createResponsesTimeline,
  listFreeTextFieldAnswers,
  listOtherChoiceAnswers,
  summarizeQuestionnaireFields,
  toSummaryDayKey,
} from "@/lib/server/modules/questionnaires/service/summary";

const ids = {
  questionnaire: "00000000-0000-4000-8000-000000000001",
  stepOne: "00000000-0000-4000-8000-000000000002",
  stepTwo: "00000000-0000-4000-8000-000000000003",
  info: "00000000-0000-4000-8000-000000000004",
  choice: "00000000-0000-4000-8000-000000000005",
  optionOne: "00000000-0000-4000-8000-000000000006",
  optionTwo: "00000000-0000-4000-8000-000000000007",
  scale: "00000000-0000-4000-8000-000000000008",
  text: "00000000-0000-4000-8000-000000000009",
  email: "00000000-0000-4000-8000-000000000010",
  consent: "00000000-0000-4000-8000-000000000011",
  boolean: "00000000-0000-4000-8000-000000000012",
};
const responseIds = [
  "00000000-0000-4000-8000-000000000021",
  "00000000-0000-4000-8000-000000000022",
  "00000000-0000-4000-8000-000000000023",
];

const definition = questionnaireDefinitionSchema.parse({
  version: 1,
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
      id: ids.stepOne,
      title: "Chi sei",
      fields: [
        { id: ids.info, type: "information", label: "Introduzione" },
        {
          id: ids.choice,
          type: "singleChoice",
          label: "Scelta pubblica",
          description: "Una sola",
          required: true,
          publicResults: true,
          options: [
            { id: ids.optionOne, label: "Uno" },
            { id: ids.optionTwo, label: "Due" },
          ],
        },
        { id: ids.scale, type: "scale", label: "Scala privata", min: 1, max: 3 },
      ],
    },
    {
      id: ids.stepTwo,
      fields: [
        { id: ids.text, type: "textarea", label: "Commento" },
        { id: ids.email, type: "email", label: "Email" },
        { id: ids.consent, type: "consent", label: "Privacy", consentText: "Accetto" },
        {
          id: ids.boolean,
          type: "boolean",
          label: "Si o no",
          trueLabel: "Si",
          falseLabel: "No",
        },
      ],
    },
  ],
});

const responses = [
  {
    id: responseIds[0],
    submittedAt: new Date("2026-03-10T09:00:00.000Z"),
    answers: {
      [ids.choice]: ids.optionOne,
      [ids.scale]: 1,
      [ids.text]: "  Primo commento  ",
      [ids.email]: "a@example.com",
      [ids.consent]: true,
      [ids.boolean]: true,
    },
  },
  {
    id: responseIds[1],
    submittedAt: new Date("2026-03-11T09:00:00.000Z"),
    answers: {
      [ids.choice]: ids.optionOne,
      [ids.scale]: 99,
      [ids.text]: "   ",
      [ids.consent]: false,
      [ids.boolean]: false,
    },
  },
  {
    id: responseIds[2],
    submittedAt: new Date("2026-03-12T09:00:00.000Z"),
    answers: { [ids.choice]: ids.optionTwo, [ids.text]: "Terzo commento" },
  },
];

describe("questionnaire summary timeline", () => {
  it("assigns responses to the Europe/Rome calendar day, not the UTC one", () => {
    // Winter (UTC+1): 23:30Z is already the next day in Rome.
    expect(toSummaryDayKey(new Date("2026-01-15T22:59:59.000Z"))).toBe("2026-01-15");
    expect(toSummaryDayKey(new Date("2026-01-15T23:00:00.000Z"))).toBe("2026-01-16");
    // Summer (UTC+2): the day turns at 22:00Z.
    expect(toSummaryDayKey(new Date("2026-07-15T21:59:59.000Z"))).toBe("2026-07-15");
    expect(toSummaryDayKey(new Date("2026-07-15T22:00:00.000Z"))).toBe("2026-07-16");
  });

  it("counts per day and fills the gaps between the first and the last response", () => {
    const timeline = createResponsesTimeline([
      new Date("2026-01-18T10:00:00.000Z"),
      new Date("2026-01-15T23:30:00.000Z"),
      new Date("2026-01-15T23:45:00.000Z"),
      new Date("2026-01-15T10:00:00.000Z"),
    ]);

    expect(timeline).toEqual({
      timezone: "Europe/Rome",
      days: [
        { date: "2026-01-15", count: 1, cumulative: 1 },
        { date: "2026-01-16", count: 2, cumulative: 3 },
        { date: "2026-01-17", count: 0, cumulative: 3 },
        { date: "2026-01-18", count: 1, cumulative: 4 },
      ],
    });
  });

  it("keeps one entry per calendar day across month ends and DST changes", () => {
    const timeline = createResponsesTimeline([
      new Date("2026-03-28T12:00:00.000Z"),
      new Date("2026-04-01T12:00:00.000Z"),
    ]);

    // 2026-03-29 is the 23-hour day on which Rome switches to summer time.
    expect(timeline.days.map((day) => day.date)).toEqual([
      "2026-03-28",
      "2026-03-29",
      "2026-03-30",
      "2026-03-31",
      "2026-04-01",
    ]);
  });

  it("returns no days without responses and a single day for a single response", () => {
    expect(createResponsesTimeline([]).days).toEqual([]);
    expect(createResponsesTimeline([new Date("2026-01-15T10:00:00.000Z")]).days).toEqual([
      { date: "2026-01-15", count: 1, cumulative: 1 },
    ]);
  });
});

describe("summarizeQuestionnaireFields", () => {
  const fields = summarizeQuestionnaireFields(definition, responses);

  it("returns every answerable field in definition order with its step", () => {
    expect(
      fields.map((field) => [field.id, field.stepIndex, field.stepTitle, field.publicResults]),
    ).toEqual([
      [ids.choice, 0, "Chi sei", true],
      [ids.scale, 0, "Chi sei", false],
      [ids.text, 1, null, false],
      [ids.email, 1, null, false],
      [ids.consent, 1, null, false],
      [ids.boolean, 1, null, false],
    ]);
    expect(fields[0]).toMatchObject({
      type: "singleChoice",
      label: "Scelta pubblica",
      description: "Una sola",
      required: true,
      stepId: ids.stepOne,
    });
  });

  it("aggregates private fields with the public analysis shape and visualization", () => {
    const scale = fields[1];
    expect(scale).toMatchObject({
      answeredCount: 1,
      missingCount: 1,
      invalidCount: 1,
      result: {
        kind: "analysis",
        analysis: {
          id: ids.scale,
          kind: "number",
          fieldType: "scale",
          responseCount: 1,
          minimum: 1,
          maximum: 1,
          visualization: { chart: "table", alternatives: ["discreteBar"] },
        },
      },
    });
    expect(fields[5]).toMatchObject({
      answeredCount: 2,
      missingCount: 1,
      result: { kind: "analysis", analysis: { kind: "boolean", trueCount: 1, falseCount: 1 } },
    });
  });

  it("produces the same field as the public analysis for a public field", () => {
    const analysis = toPublicQuestionnaireAnalysis({
      id: ids.questionnaire,
      title: "Chiuso",
      descriptionRich: null,
      closedAt: new Date("2026-04-01T10:00:00.000Z"),
      definition,
      responses,
    });

    expect(analysis?.fields).toHaveLength(1);
    expect(fields[0].result).toEqual({ kind: "analysis", analysis: analysis?.fields[0] });
  });

  it("counts answered and missing free-text answers, ignoring blank strings", () => {
    expect(fields[2]).toMatchObject({
      type: "textarea",
      answeredCount: 2,
      missingCount: 1,
      invalidCount: 0,
      result: { kind: "text" },
    });
    expect(fields[3]).toMatchObject({ type: "email", answeredCount: 1, missingCount: 2 });
    expect(JSON.stringify(fields)).not.toContain("Primo commento");
    expect(JSON.stringify(fields)).not.toContain("a@example.com");
  });

  it("counts consent answers", () => {
    expect(fields[4]).toMatchObject({
      answeredCount: 2,
      missingCount: 1,
      invalidCount: 0,
      result: { kind: "consent", acceptedCount: 1, declinedCount: 1 },
    });
  });

  it("keeps all fields with zero counts when there are no responses", () => {
    const empty = summarizeQuestionnaireFields(definition, []);
    expect(empty).toHaveLength(6);
    expect(empty.every((field) => field.answeredCount === 0 && field.missingCount === 0)).toBe(
      true,
    );
    expect(empty[0].result).toMatchObject({
      kind: "analysis",
      analysis: { visualization: { chart: "table", rationale: "emptyData" } },
    });
  });
});

describe("listFreeTextFieldAnswers", () => {
  it("returns the trimmed non-empty answers newest first", () => {
    expect(listFreeTextFieldAnswers(ids.text, responses)).toEqual([
      {
        responseId: responseIds[2],
        submittedAt: "2026-03-12T09:00:00.000Z",
        value: "Terzo commento",
      },
      {
        responseId: responseIds[0],
        submittedAt: "2026-03-10T09:00:00.000Z",
        value: "Primo commento",
      },
    ]);
  });

  it("ignores non-string values and malformed answers", () => {
    expect(
      listFreeTextFieldAnswers(ids.text, [
        { id: responseIds[0], submittedAt: new Date(), answers: { [ids.text]: 12 } },
        { id: responseIds[1], submittedAt: new Date(), answers: null },
        { id: responseIds[2], submittedAt: new Date(), answers: ["x"] },
      ]),
    ).toEqual([]);
  });
});

describe("listQuestionnaireResponsesFilterSchema", () => {
  it("accepts open and closed ranges of ISO instants", () => {
    expect(listQuestionnaireResponsesFilterSchema.safeParse({}).success).toBe(true);
    expect(
      listQuestionnaireResponsesFilterSchema.safeParse({
        submittedFrom: "2026-03-10T00:00:00+01:00",
        submittedTo: "2026-03-10T23:59:59.999+01:00",
      }).success,
    ).toBe(true);
  });

  it("rejects plain dates and inverted ranges", () => {
    expect(
      listQuestionnaireResponsesFilterSchema.safeParse({ submittedFrom: "2026-03-10" }).success,
    ).toBe(false);
    expect(
      listQuestionnaireResponsesFilterSchema.safeParse({
        submittedFrom: "2026-03-11T00:00:00Z",
        submittedTo: "2026-03-10T00:00:00Z",
      }).success,
    ).toBe(false);
  });
});

describe("summarizeQuestionnaireFields: Altro and conditional fields", () => {
  const detail = "00000000-0000-4000-8000-000000000031";
  const multiple = "00000000-0000-4000-8000-000000000032";
  const multipleOption = "00000000-0000-4000-8000-000000000033";
  const logicDefinition = questionnaireDefinitionSchema.parse({
    ...definition,
    steps: [
      {
        id: ids.stepOne,
        fields: [
          {
            id: ids.choice,
            type: "singleChoice",
            label: "Scelta",
            allowOther: true,
            otherMaxLength: 10,
            options: [
              { id: ids.optionOne, label: "Uno" },
              { id: ids.optionTwo, label: "Due" },
            ],
          },
          {
            id: multiple,
            type: "multipleChoice",
            label: "Multipla",
            allowOther: true,
            options: [{ id: multipleOption, label: "Tre" }],
          },
          {
            id: detail,
            type: "text",
            label: "Solo se Uno",
            required: true,
            visibleWhen: { fieldId: ids.choice, operator: "equals", value: ids.optionOne },
          },
        ],
      },
    ],
  });
  const logicResponses = [
    {
      id: responseIds[0],
      submittedAt: new Date("2026-03-10T09:00:00.000Z"),
      answers: {
        [ids.choice]: { other: "Primo" },
        [multiple]: [multipleOption, { other: "Quattro" }],
      },
    },
    {
      id: responseIds[1],
      submittedAt: new Date("2026-03-11T09:00:00.000Z"),
      answers: { [ids.choice]: { other: " Secondo " }, [multiple]: [multipleOption] },
    },
    {
      id: responseIds[2],
      submittedAt: new Date("2026-03-12T09:00:00.000Z"),
      answers: { [ids.choice]: ids.optionOne, [detail]: "Dettaglio" },
    },
  ];
  const fields = summarizeQuestionnaireFields(logicDefinition, logicResponses);

  it("lists the Altro free texts newest first next to the analysis", () => {
    const [choice, multipleField] = fields;

    expect(choice?.result).toMatchObject({
      kind: "analysis",
      otherAnswers: [
        { responseId: responseIds[1], submittedAt: "2026-03-11T09:00:00.000Z", value: "Secondo" },
        { responseId: responseIds[0], submittedAt: "2026-03-10T09:00:00.000Z", value: "Primo" },
      ],
    });
    expect(multipleField?.result).toMatchObject({
      otherAnswers: [{ responseId: responseIds[0], value: "Quattro" }],
    });
    expect(
      choice?.result.kind === "analysis"
        ? choice.result.analysis.kind === "choice" &&
            choice.result.analysis.options.find((option) => option.isOther)?.count
        : null,
    ).toBe(2);
  });

  it("omits otherAnswers for fields without Altro, old payloads included", () => {
    const legacy = summarizeQuestionnaireFields(definition, responses);

    expect(legacy[0]?.result).not.toHaveProperty("otherAnswers");
    expect(legacy[1]?.result).not.toHaveProperty("otherAnswers");
  });

  it("lists only the free texts that are valid for the field", () => {
    const choice = logicDefinition.steps[0]!.fields[0]!;
    if (choice.type !== "singleChoice") throw new Error("unexpected fixture");

    expect(
      listOtherChoiceAnswers(choice, [
        {
          id: responseIds[0],
          submittedAt: new Date(0),
          answers: { [ids.choice]: { other: "  " } },
        },
        {
          id: responseIds[1],
          submittedAt: new Date(0),
          answers: { [ids.choice]: { other: "x".repeat(11) } },
        },
        { id: responseIds[2], submittedAt: new Date(0), answers: null },
      ]),
    ).toEqual([]);
  });

  it("counts a hidden field as missing, not as invalid", () => {
    expect(fields[2]).toMatchObject({
      id: detail,
      answeredCount: 1,
      missingCount: 2,
      invalidCount: 0,
    });
  });
});
