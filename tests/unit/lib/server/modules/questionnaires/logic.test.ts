import { describe, expect, it } from "vitest";

import {
  clearInvalidQuestionnaireConditions,
  coerceQuestionnaireConditionValue,
  countQuestionnaireConditions,
  createQuestionnaireAnswersSchema,
  createQuestionnaireRule,
  describeQuestionnaireRule,
  getQuestionnaireConditionIssue,
  getQuestionnaireConditionOperators,
  getQuestionnaireOtherLabel,
  isQuestionnaireConditionSatisfied,
  isQuestionnaireScaleValue,
  listQuestionnaireRuleSourceFields,
  matchesQuestionnaireRule,
  QUESTIONNAIRE_OTHER_OPTION_ID,
  questionnaireDefinitionSchema,
  resolveQuestionnaireLogic,
} from "@/lib/server/modules/questionnaires/schema/definition";

import type {
  QuestionnaireDefinition,
  QuestionnaireField,
  QuestionnaireFieldCondition,
} from "@/lib/server/modules/questionnaires/schema/definition";

const uuid = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

const ids = {
  stepOne: uuid(1),
  stepTwo: uuid(2),
  stepThree: uuid(3),
  agree: uuid(10),
  color: uuid(11),
  red: uuid(12),
  blue: uuid(13),
  green: uuid(14),
  devices: uuid(15),
  phone: uuid(16),
  tablet: uuid(17),
  laptop: uuid(18),
  rating: uuid(19),
  age: uuid(20),
  hours: uuid(21),
  day: uuid(22),
  moment: uuid(23),
  consent: uuid(24),
  name: uuid(25),
  followUp: uuid(26),
  last: uuid(27),
  note: uuid(28),
};

const copy = {
  progressLabel: "Progresso",
  backLabel: "Indietro",
  nextLabel: "Avanti",
  submitLabel: "Invia",
  requiredFieldsMessage: "Obbligatori",
  resumeMessage: "Riprendi",
  successTitle: "Grazie",
  successMessage: "Fatto",
  alreadySubmittedTitle: "Gia inviato",
  alreadySubmittedMessage: "Gia inviato",
  closedTitle: "Chiuso",
  closedMessage: "Chiuso",
  resultsTitle: "Risultati",
  resultsEmptyMessage: "Vuoto",
};

type Patch = Record<string, unknown>;

/** Three steps with one field of every controlling type, then two dependent fields. */
function build(
  patches: { followUp?: Patch; last?: Patch; stepTwo?: Patch; stepOne?: Patch; color?: Patch } = {},
) {
  return {
    version: 1 as const,
    copy,
    steps: [
      {
        id: ids.stepOne,
        fields: [
          { id: ids.agree, type: "boolean", label: "Accordo", trueLabel: "Si", falseLabel: "No" },
          {
            id: ids.color,
            type: "singleChoice",
            label: "Colore",
            allowOther: true,
            options: [
              { id: ids.red, label: "Rosso" },
              { id: ids.blue, label: "Blu" },
              { id: ids.green, label: "Verde" },
            ],
            ...patches.color,
          },
          {
            id: ids.devices,
            type: "multipleChoice",
            label: "Dispositivi",
            options: [
              { id: ids.phone, label: "Telefono" },
              { id: ids.tablet, label: "Tablet" },
              { id: ids.laptop, label: "Computer" },
            ],
          },
          { id: ids.rating, type: "scale", label: "Voto", min: 1, max: 5 },
          { id: ids.age, type: "integer", label: "Eta", min: 0, max: 120 },
          { id: ids.hours, type: "decimal", label: "Ore" },
          { id: ids.day, type: "date", label: "Giorno" },
          { id: ids.moment, type: "datetime", label: "Momento" },
          { id: ids.consent, type: "consent", label: "Consenso", consentText: "Accetto" },
          { id: ids.name, type: "text", label: "Nome" },
          { id: ids.note, type: "information", label: "Nota" },
        ],
        ...patches.stepOne,
      },
      {
        id: ids.stepTwo,
        fields: [{ id: ids.followUp, type: "text", label: "Seguito", ...patches.followUp }],
        ...patches.stepTwo,
      },
      {
        id: ids.stepThree,
        fields: [{ id: ids.last, type: "text", label: "Ultima", ...patches.last }],
      },
    ],
  };
}

function parse(patches: Parameters<typeof build>[0] = {}): QuestionnaireDefinition {
  return questionnaireDefinitionSchema.parse(build(patches));
}

const base = parse();
const fieldsById = new Map<string, QuestionnaireField>(
  base.steps.flatMap((step) => step.fields).map((field) => [field.id, field]),
);
const field = (id: string) => fieldsById.get(id)!;

function isShown(visibleWhen: unknown, answers: Record<string, unknown>) {
  return resolveQuestionnaireLogic(
    parse({ followUp: { visibleWhen } }),
    answers,
  ).visibleFieldIds.has(ids.followUp);
}

describe("questionnaire condition operators", () => {
  it("offers comparisons on numbers and dates, sets on choices, presence on free text", () => {
    expect(getQuestionnaireConditionOperators(field(ids.rating))).toContain("greaterThanOrEqual");
    expect(getQuestionnaireConditionOperators(field(ids.age))).toContain("between");
    expect(getQuestionnaireConditionOperators(field(ids.day))).toContain("lessThan");
    expect(getQuestionnaireConditionOperators(field(ids.color))).toEqual(
      expect.arrayContaining(["isOneOf", "isNoneOf", "answered", "notAnswered"]),
    );
    expect(getQuestionnaireConditionOperators(field(ids.devices))).toEqual(
      expect.arrayContaining(["notIncludes", "includesAny", "includesAll", "selectedAtLeast"]),
    );
    expect(getQuestionnaireConditionOperators(field(ids.consent))).toEqual(["equals"]);
    expect(getQuestionnaireConditionOperators(field(ids.name))).toEqual([
      "answered",
      "notAnswered",
    ]);
    expect(getQuestionnaireConditionOperators(field(ids.note))).toEqual([]);
  });

  it.each<[string, QuestionnaireFieldCondition]>([
    ["scale comparison", { fieldId: ids.rating, operator: "lessThanOrEqual", value: 2 }],
    ["scale range", { fieldId: ids.rating, operator: "between", value: [2, 4] }],
    ["integer comparison", { fieldId: ids.age, operator: "lessThan", value: 18 }],
    ["decimal comparison", { fieldId: ids.hours, operator: "greaterThan", value: 7.5 }],
    ["date comparison", { fieldId: ids.day, operator: "greaterThanOrEqual", value: "2026-06-01" }],
    [
      "datetime range",
      {
        fieldId: ids.moment,
        operator: "between",
        value: ["2026-06-01T08:00:00+02:00", "2026-06-01T18:00:00+02:00"],
      },
    ],
    ["choice list", { fieldId: ids.color, operator: "isOneOf", value: [ids.red, ids.blue] }],
    [
      "the Altro choice",
      { fieldId: ids.color, operator: "equals", value: QUESTIONNAIRE_OTHER_OPTION_ID },
    ],
    [
      "multiple list",
      { fieldId: ids.devices, operator: "includesAll", value: [ids.phone, ids.tablet] },
    ],
    ["selection count", { fieldId: ids.devices, operator: "selectedAtLeast", value: 2 }],
    ["consent", { fieldId: ids.consent, operator: "equals", value: true }],
    ["presence", { fieldId: ids.name, operator: "answered" }],
  ])("accepts a %s condition", (_label, condition) => {
    expect(getQuestionnaireConditionIssue(condition, field(condition.fieldId))).toBeNull();
    expect(
      questionnaireDefinitionSchema.safeParse(build({ followUp: { visibleWhen: condition } }))
        .success,
    ).toBe(true);
  });

  it.each<[string, QuestionnaireFieldCondition]>([
    ["a scale value off the step", { fieldId: ids.rating, operator: "equals", value: 2.5 }],
    ["a scale value out of range", { fieldId: ids.rating, operator: "greaterThan", value: 9 }],
    ["a reversed range", { fieldId: ids.rating, operator: "between", value: [4, 2] }],
    ["a non-integer on an integer", { fieldId: ids.age, operator: "equals", value: 1.5 }],
    ["an invalid date", { fieldId: ids.day, operator: "lessThan", value: "domani" }],
    ["a date on a datetime", { fieldId: ids.moment, operator: "lessThan", value: "2026-06-01" }],
    ["an empty-ish list", { fieldId: ids.color, operator: "isOneOf", value: ids.red }],
    ["duplicated options", { fieldId: ids.color, operator: "isOneOf", value: [ids.red, ids.red] }],
    [
      "Altro where not allowed",
      { fieldId: ids.devices, operator: "includes", value: QUESTIONNAIRE_OTHER_OPTION_ID },
    ],
    ["too many selections", { fieldId: ids.devices, operator: "selectedAtLeast", value: 9 }],
    ["a value on a presence check", { fieldId: ids.name, operator: "answered", value: true }],
    ["a comparison on free text", { fieldId: ids.name, operator: "equals", value: "x" }],
    ["an information block", { fieldId: ids.note, operator: "answered" }],
  ])("rejects %s", (_label, condition) => {
    expect(getQuestionnaireConditionIssue(condition, field(condition.fieldId))).not.toBeNull();
    expect(
      questionnaireDefinitionSchema.safeParse(build({ followUp: { visibleWhen: condition } }))
        .success,
    ).toBe(false);
  });

  it("knows the values of a scale", () => {
    expect(isQuestionnaireScaleValue({ min: 1, max: 5 }, 3)).toBe(true);
    expect(isQuestionnaireScaleValue({ min: 1, max: 5 }, 2.5)).toBe(false);
    expect(isQuestionnaireScaleValue({ min: 0, max: 1, step: 0.1 }, 0.3)).toBe(true);
    expect(isQuestionnaireScaleValue({ min: 1, max: 5 }, 6)).toBe(false);
  });
});

describe("questionnaire condition evaluation", () => {
  const check = (condition: QuestionnaireFieldCondition, answer: unknown) =>
    isQuestionnaireConditionSatisfied(condition, field(condition.fieldId), answer);

  it("compares numbers", () => {
    expect(check({ fieldId: ids.rating, operator: "lessThanOrEqual", value: 2 }, 2)).toBe(true);
    expect(check({ fieldId: ids.rating, operator: "lessThan", value: 2 }, 2)).toBe(false);
    expect(check({ fieldId: ids.age, operator: "greaterThan", value: 17 }, 18)).toBe(true);
    expect(check({ fieldId: ids.age, operator: "between", value: [18, 30] }, 30)).toBe(true);
    expect(check({ fieldId: ids.age, operator: "between", value: [18, 30] }, 31)).toBe(false);
  });

  it("compares dates and instants, whatever their offset", () => {
    expect(
      check({ fieldId: ids.day, operator: "lessThan", value: "2026-06-01" }, "2026-05-31"),
    ).toBe(true);
    expect(
      check(
        { fieldId: ids.moment, operator: "greaterThanOrEqual", value: "2026-06-01T10:00:00+02:00" },
        "2026-06-01T08:00:00.000Z",
      ),
    ).toBe(true);
  });

  it("handles sets of options, the Altro choice and selection counts", () => {
    expect(
      check({ fieldId: ids.color, operator: "isOneOf", value: [ids.red, ids.blue] }, ids.blue),
    ).toBe(true);
    expect(
      check({ fieldId: ids.color, operator: "isNoneOf", value: [ids.red, ids.blue] }, ids.green),
    ).toBe(true);
    expect(
      check(
        { fieldId: ids.color, operator: "equals", value: QUESTIONNAIRE_OTHER_OPTION_ID },
        { other: "" },
      ),
    ).toBe(true);
    const picked = [ids.phone, ids.tablet];
    expect(
      check({ fieldId: ids.devices, operator: "notIncludes", value: ids.laptop }, picked),
    ).toBe(true);
    expect(
      check(
        { fieldId: ids.devices, operator: "includesAny", value: [ids.laptop, ids.tablet] },
        picked,
      ),
    ).toBe(true);
    expect(
      check(
        { fieldId: ids.devices, operator: "includesAll", value: [ids.laptop, ids.tablet] },
        picked,
      ),
    ).toBe(false);
    expect(check({ fieldId: ids.devices, operator: "selectedAtLeast", value: 2 }, picked)).toBe(
      true,
    );
    expect(check({ fieldId: ids.devices, operator: "selectedAtMost", value: 1 }, picked)).toBe(
      false,
    );
  });

  it("fires negative operators only on a real answer, and notAnswered on a blank one", () => {
    expect(check({ fieldId: ids.color, operator: "notEquals", value: ids.red }, undefined)).toBe(
      false,
    );
    expect(check({ fieldId: ids.devices, operator: "notIncludes", value: ids.phone }, [])).toBe(
      false,
    );
    expect(check({ fieldId: ids.rating, operator: "notEquals", value: 5 }, undefined)).toBe(false);
    expect(check({ fieldId: ids.color, operator: "notAnswered" }, undefined)).toBe(true);
    expect(check({ fieldId: ids.name, operator: "notAnswered" }, "  ")).toBe(true);
    expect(check({ fieldId: ids.name, operator: "answered" }, "Ada")).toBe(true);
  });

  it("treats an unchecked consent as a false answer", () => {
    expect(check({ fieldId: ids.consent, operator: "equals", value: false }, undefined)).toBe(true);
    expect(check({ fieldId: ids.consent, operator: "equals", value: true }, true)).toBe(true);
  });
});

describe("questionnaire rules", () => {
  const low = { fieldId: ids.rating, operator: "lessThanOrEqual" as const, value: 2 };
  const red = { fieldId: ids.color, operator: "equals" as const, value: ids.red };

  it("combines conditions with all (E) or any (O)", () => {
    const all = { match: "all", conditions: [low, red] };
    const any = { match: "any", conditions: [low, red] };
    expect(isShown(all, { [ids.rating]: 1 })).toBe(false);
    expect(isShown(all, { [ids.rating]: 1, [ids.color]: ids.red })).toBe(true);
    expect(isShown(any, { [ids.rating]: 1 })).toBe(true);
    expect(isShown(any, { [ids.rating]: 4, [ids.color]: ids.blue })).toBe(false);
  });

  it("reports the invalid condition of a group at its own path", () => {
    const result = questionnaireDefinitionSchema.safeParse(
      build({
        followUp: {
          visibleWhen: {
            match: "any",
            conditions: [low, { fieldId: ids.last, operator: "answered" }],
          },
        },
      }),
    );
    expect(result.error?.issues[0]?.path).toEqual([
      "steps",
      1,
      "fields",
      0,
      "visibleWhen",
      "conditions",
      1,
    ]);
  });

  it("builds the most compact rule", () => {
    expect(createQuestionnaireRule([])).toBeUndefined();
    expect(createQuestionnaireRule([low], "any")).toEqual(low);
    expect(createQuestionnaireRule([low, red], "any")).toEqual({
      match: "any",
      conditions: [low, red],
    });
  });

  it("hides a whole step and skips everything after an ending step", () => {
    const hiddenStep = parse({ stepTwo: { visibleWhen: red } });
    expect(resolveQuestionnaireLogic(hiddenStep, {}).visibleFieldIds.has(ids.followUp)).toBe(false);
    expect(
      resolveQuestionnaireLogic(hiddenStep, { [ids.color]: ids.red }).visibleFieldIds.has(
        ids.followUp,
      ),
    ).toBe(true);

    const ending = parse({
      stepOne: { endWhen: { fieldId: ids.agree, operator: "equals", value: false } },
    });
    const ended = resolveQuestionnaireLogic(ending, { [ids.agree]: false });
    expect(ended.endedAtStepIndex).toBe(0);
    expect(ended.visibleFieldIds.has(ids.followUp)).toBe(false);
    expect(ended.visibleFieldIds.has(ids.last)).toBe(false);
    expect(resolveQuestionnaireLogic(ending, { [ids.agree]: true }).endedAtStepIndex).toBeNull();
    // A hidden required field after the end never blocks the submission.
    const strict = parse({
      stepOne: { endWhen: { fieldId: ids.agree, operator: "equals", value: false } },
      last: { required: true },
    });
    expect(createQuestionnaireAnswersSchema(strict).safeParse({ [ids.agree]: false }).success).toBe(
      true,
    );
    expect(createQuestionnaireAnswersSchema(strict).safeParse({ [ids.agree]: true }).success).toBe(
      false,
    );
  });

  it("lets a step rule only see earlier steps and an end rule its own step too", () => {
    const onOwnStep = { fieldId: ids.followUp, operator: "answered" as const };
    expect(
      questionnaireDefinitionSchema.safeParse(build({ stepTwo: { visibleWhen: onOwnStep } }))
        .success,
    ).toBe(false);
    expect(
      questionnaireDefinitionSchema.safeParse(build({ stepTwo: { endWhen: onOwnStep } })).success,
    ).toBe(true);
    expect(listQuestionnaireRuleSourceFields(base, { kind: "step", stepIndex: 0 })).toEqual([]);
    expect(
      listQuestionnaireRuleSourceFields(base, { kind: "stepEnd", stepIndex: 1 }).map(
        (item) => item.id,
      ),
    ).toContain(ids.followUp);
    expect(listQuestionnaireRuleSourceFields(base, { kind: "all" })).toHaveLength(12);
  });

  it("makes a field mandatory only while requiredWhen is satisfied", () => {
    const definition = parse({
      followUp: { requiredWhen: { fieldId: ids.consent, operator: "equals", value: true } },
    });
    const schema = createQuestionnaireAnswersSchema(definition);
    expect(resolveQuestionnaireLogic(definition, {}).requiredFieldIds.has(ids.followUp)).toBe(
      false,
    );
    expect(schema.safeParse({}).success).toBe(true);
    const missing = schema.safeParse({ [ids.consent]: true });
    expect(missing.error?.issues.map((issue) => issue.path)).toEqual([[ids.followUp]]);
    expect(schema.safeParse({ [ids.consent]: true, [ids.followUp]: "Ok" }).success).toBe(true);
  });

  it("offers conditional options only when their rule holds", () => {
    const definition = parse({
      color: {
        allowOther: false,
        options: [
          { id: ids.red, label: "Rosso" },
          {
            id: ids.blue,
            label: "Blu",
            visibleWhen: { fieldId: ids.agree, operator: "equals", value: true },
          },
        ],
      },
    });
    const schema = createQuestionnaireAnswersSchema(definition);
    expect(resolveQuestionnaireLogic(definition, {}).hiddenOptionIds.has(ids.blue)).toBe(true);
    expect(schema.safeParse({ [ids.color]: ids.blue }).success).toBe(false);
    expect(schema.safeParse({ [ids.agree]: true, [ids.color]: ids.blue }).success).toBe(true);
    // A stale pick of a hidden option does not count as an answer for later conditions.
    const dependent = parse({
      color: {
        allowOther: false,
        options: [
          { id: ids.red, label: "Rosso" },
          {
            id: ids.blue,
            label: "Blu",
            visibleWhen: { fieldId: ids.agree, operator: "equals", value: true },
          },
        ],
      },
      followUp: { visibleWhen: { fieldId: ids.color, operator: "equals", value: ids.blue } },
    });
    expect(
      resolveQuestionnaireLogic(dependent, { [ids.color]: ids.blue }).visibleFieldIds.has(
        ids.followUp,
      ),
    ).toBe(false);
  });

  it("hides a choice left without options to pick", () => {
    const rule = { fieldId: ids.agree, operator: "equals" as const, value: true };
    const definition = parse({
      color: { allowOther: false, options: [{ id: ids.red, label: "Rosso", visibleWhen: rule }] },
    });
    expect(resolveQuestionnaireLogic(definition, {}).visibleFieldIds.has(ids.color)).toBe(false);
    expect(
      resolveQuestionnaireLogic(definition, { [ids.agree]: true }).visibleFieldIds.has(ids.color),
    ).toBe(true);
  });

  it("requires a mandatory consent to be given, not just present", () => {
    const definition = questionnaireDefinitionSchema.parse({
      ...build(),
      steps: [
        {
          id: ids.stepOne,
          fields: [
            {
              id: ids.consent,
              type: "consent",
              label: "Privacy",
              consentText: "Ok",
              required: true,
            },
          ],
        },
      ],
    });
    const schema = createQuestionnaireAnswersSchema(definition);
    expect(schema.safeParse({ [ids.consent]: true }).success).toBe(true);
    expect(schema.safeParse({ [ids.consent]: false }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("only accepts the values a scale offers as answers", () => {
    const schema = createQuestionnaireAnswersSchema(base);
    expect(schema.safeParse({ [ids.rating]: 3 }).success).toBe(true);
    expect(schema.safeParse({ [ids.rating]: 2.5 }).success).toBe(false);
  });

  it("never satisfies a condition on a hidden controlling field, notAnswered included", () => {
    const definition = questionnaireDefinitionSchema.parse({
      ...build({ last: { visibleWhen: { fieldId: ids.followUp, operator: "notAnswered" } } }),
    });
    const hidden = parse({
      followUp: { visibleWhen: { fieldId: ids.agree, operator: "equals", value: true } },
      last: { visibleWhen: { fieldId: ids.followUp, operator: "notAnswered" } },
    });
    expect(resolveQuestionnaireLogic(definition, {}).visibleFieldIds.has(ids.last)).toBe(true);
    expect(resolveQuestionnaireLogic(hidden, {}).visibleFieldIds.has(ids.last)).toBe(false);
  });

  it("drops only the conditions that became invalid, wherever they live", () => {
    const stale = { fieldId: uuid(999), operator: "answered" as const };
    const definition = {
      ...build({
        followUp: { visibleWhen: { match: "any", conditions: [low, stale] }, requiredWhen: stale },
        stepTwo: { visibleWhen: stale, endWhen: red },
        color: {
          options: [
            { id: ids.red, label: "Rosso", visibleWhen: stale },
            { id: ids.blue, label: "Blu" },
          ],
        },
      }),
    } as unknown as QuestionnaireDefinition;

    expect(countQuestionnaireConditions(definition)).toBe(6);
    const cleaned = clearInvalidQuestionnaireConditions(definition);
    expect(countQuestionnaireConditions(cleaned)).toBe(2);
    expect(cleaned.steps[1]?.visibleWhen).toBeUndefined();
    expect(cleaned.steps[1]?.endWhen).toEqual(red);
    expect(cleaned.steps[1]?.fields[0]?.visibleWhen).toEqual(low);
    expect(cleaned.steps[1]?.fields[0]?.requiredWhen).toBeUndefined();
    expect(questionnaireDefinitionSchema.safeParse(cleaned).success).toBe(true);
    expect(clearInvalidQuestionnaireConditions(cleaned)).toBe(cleaned);
  });

  it("filters answers by a rule on any field", () => {
    const rule = { match: "all" as const, conditions: [low, red] };
    expect(matchesQuestionnaireRule(base, { [ids.rating]: 2, [ids.color]: ids.red }, rule)).toBe(
      true,
    );
    expect(matchesQuestionnaireRule(base, { [ids.rating]: 2, [ids.color]: ids.blue }, rule)).toBe(
      false,
    );
    expect(matchesQuestionnaireRule(base, {}, { fieldId: ids.last, operator: "notAnswered" })).toBe(
      true,
    );
  });

  it("describes a rule with labels instead of ids", () => {
    expect(
      describeQuestionnaireRule(
        {
          match: "any",
          conditions: [
            {
              fieldId: ids.color,
              operator: "isOneOf",
              value: [ids.red, QUESTIONNAIRE_OTHER_OPTION_ID],
            },
            low,
          ],
        },
        fieldsById,
        getQuestionnaireOtherLabel,
      ),
    ).toEqual({
      match: "any",
      conditions: [
        {
          fieldLabel: "Colore",
          operator: "isOneOf",
          valueKind: "text",
          values: ["Rosso", "Altro"],
        },
        { fieldLabel: "Voto", operator: "lessThanOrEqual", valueKind: "number", values: [2] },
      ],
    });
  });

  it("converts the value when the operator changes", () => {
    const now = new Date("2026-03-04T10:00:00.000Z");
    expect(coerceQuestionnaireConditionValue(field(ids.rating), "between", 2)).toEqual([2, 5]);
    expect(coerceQuestionnaireConditionValue(field(ids.rating), "equals", [2, 4])).toBe(2);
    expect(coerceQuestionnaireConditionValue(field(ids.color), "isOneOf", ids.blue)).toEqual([
      ids.blue,
    ]);
    expect(coerceQuestionnaireConditionValue(field(ids.color), "equals", [ids.blue, ids.red])).toBe(
      ids.blue,
    );
    expect(
      coerceQuestionnaireConditionValue(field(ids.color), "answered", ids.blue),
    ).toBeUndefined();
    expect(coerceQuestionnaireConditionValue(field(ids.day), "equals", undefined, now)).toBe(
      "2026-03-04",
    );
    expect(
      coerceQuestionnaireConditionValue(field(ids.devices), "selectedAtLeast", ids.phone),
    ).toBe(1);
  });
});
