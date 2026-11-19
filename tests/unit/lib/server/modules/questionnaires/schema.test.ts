import {
  createQuestionnaireAnswersSchema,
  createQuestionnaireInputSchema,
  questionnaireDefinitionSchema,
} from "@/lib/server/modules/questionnaires/schema";
import {
  clearInvalidQuestionnaireConditions,
  createQuestionnaireCondition,
  createQuestionnaireStepAnswersSchema,
  getQuestionnaireConditionOperators,
  getQuestionnaireOtherLabel,
  getQuestionnaireOtherMaxLength,
  getVisibleQuestionnaireFieldIds,
  isQuestionnaireFieldVisible,
  isQuestionnaireOtherAnswer,
  listQuestionnaireConditionSourceFields,
  QUESTIONNAIRE_OTHER_DEFAULT_LABEL,
  QUESTIONNAIRE_OTHER_DEFAULT_MAX_LENGTH,
  QUESTIONNAIRE_OTHER_OPTION_ID,
} from "@/lib/server/modules/questionnaires/schema/definition";

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

  it("trims questionnaire creation fields", () => {
    const parsed = createQuestionnaireInputSchema.parse({
      title: "  Ricerca  ",
      slug: "ricerca",
      definition: definition(),
    });

    expect(parsed.title).toBe("Ricerca");
  });
});

const logicIds = {
  stepOne: "00000000-0000-4000-8000-000000000101",
  stepTwo: "00000000-0000-4000-8000-000000000102",
  hasPet: "00000000-0000-4000-8000-000000000103",
  petKind: "00000000-0000-4000-8000-000000000104",
  dog: "00000000-0000-4000-8000-000000000105",
  cat: "00000000-0000-4000-8000-000000000106",
  dogName: "00000000-0000-4000-8000-000000000107",
  topics: "00000000-0000-4000-8000-000000000108",
  news: "00000000-0000-4000-8000-000000000109",
  sport: "00000000-0000-4000-8000-000000000110",
  newsDetail: "00000000-0000-4000-8000-000000000111",
  rating: "00000000-0000-4000-8000-000000000112",
  ratingWhy: "00000000-0000-4000-8000-000000000113",
};

function logicDefinition() {
  return {
    version: 1 as const,
    copy: definition().copy,
    steps: [
      {
        id: logicIds.stepOne,
        fields: [
          {
            id: logicIds.hasPet,
            type: "boolean" as const,
            label: "Hai un animale?",
            required: true,
            trueLabel: "Si",
            falseLabel: "No",
          },
          {
            id: logicIds.petKind,
            type: "singleChoice" as const,
            label: "Quale?",
            required: true,
            allowOther: true,
            otherMaxLength: 20,
            options: [
              { id: logicIds.dog, label: "Cane" },
              { id: logicIds.cat, label: "Gatto" },
            ],
            visibleWhen: { fieldId: logicIds.hasPet, operator: "equals" as const, value: true },
          },
        ],
      },
      {
        id: logicIds.stepTwo,
        fields: [
          {
            id: logicIds.dogName,
            type: "text" as const,
            label: "Nome del cane",
            required: true,
            visibleWhen: {
              fieldId: logicIds.petKind,
              operator: "equals" as const,
              value: logicIds.dog,
            },
          },
          {
            id: logicIds.topics,
            type: "multipleChoice" as const,
            label: "Temi",
            allowOther: true,
            otherLabel: "Altro tema",
            minSelections: 1,
            maxSelections: 2,
            options: [
              { id: logicIds.news, label: "Notizie" },
              { id: logicIds.sport, label: "Sport" },
            ],
          },
          {
            id: logicIds.newsDetail,
            type: "text" as const,
            label: "Quali notizie?",
            required: true,
            visibleWhen: {
              fieldId: logicIds.topics,
              operator: "includes" as const,
              value: logicIds.news,
            },
          },
          { id: logicIds.rating, type: "scale" as const, label: "Voto", min: 1, max: 5 },
          {
            id: logicIds.ratingWhy,
            type: "text" as const,
            label: "Perche non 5?",
            required: true,
            visibleWhen: { fieldId: logicIds.rating, operator: "notEquals" as const, value: 5 },
          },
        ],
      },
    ],
  };
}

type LogicField = ReturnType<typeof logicDefinition>["steps"][number]["fields"][number];

function withField(fieldId: string, patch: Record<string, unknown>) {
  const input = logicDefinition();
  return {
    ...input,
    steps: input.steps.map((step) => ({
      ...step,
      fields: step.fields.map((field: LogicField) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    })),
  };
}

describe("questionnaire conditional fields (visibleWhen)", () => {
  const parsed = questionnaireDefinitionSchema.parse(logicDefinition());

  it("accepts conditions on earlier boolean, choice and scale fields", () => {
    expect(parsed.steps[0]?.fields[1]?.visibleWhen).toEqual({
      fieldId: logicIds.hasPet,
      operator: "equals",
      value: true,
    });
  });

  it("keeps definitions without conditions valid and unchanged", () => {
    const legacy = questionnaireDefinitionSchema.parse(definition());
    expect(legacy.version).toBe(1);
    expect(legacy.steps[0]?.fields.every((field) => field.visibleWhen === undefined)).toBe(true);
  });

  it.each([
    [
      "an unknown field",
      { fieldId: "00000000-0000-4000-8000-000000000199", operator: "equals", value: true },
    ],
    ["itself", { fieldId: logicIds.petKind, operator: "equals", value: logicIds.dog }],
    ["a later field", { fieldId: logicIds.rating, operator: "equals", value: 3 }],
    [
      "an incompatible operator",
      { fieldId: logicIds.hasPet, operator: "includes", value: logicIds.dog },
    ],
    ["a value of the wrong type", { fieldId: logicIds.hasPet, operator: "equals", value: 1 }],
  ])("rejects a condition referencing %s", (_label, visibleWhen) => {
    const result = questionnaireDefinitionSchema.safeParse(
      withField(logicIds.petKind, { visibleWhen }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["steps", 0, "fields", 1, "visibleWhen"]);
  });

  it("rejects unknown options, out-of-range scale values and non-controlling field types", () => {
    for (const visibleWhen of [
      { fieldId: logicIds.petKind, operator: "equals", value: logicIds.news },
      { fieldId: logicIds.topics, operator: "equals", value: logicIds.news },
      { fieldId: logicIds.rating, operator: "equals", value: 9 },
      { fieldId: logicIds.dogName, operator: "equals", value: true },
    ]) {
      expect(
        questionnaireDefinitionSchema.safeParse(withField(logicIds.ratingWhy, { visibleWhen }))
          .success,
      ).toBe(false);
    }
  });

  it("resolves visibility, including chains through hidden fields", () => {
    expect([...getVisibleQuestionnaireFieldIds(parsed, {})]).toEqual([
      logicIds.hasPet,
      logicIds.topics,
      logicIds.rating,
    ]);
    const petKind = parsed.steps[0]!.fields[1]!;
    const dogName = parsed.steps[1]!.fields[0]!;
    expect(isQuestionnaireFieldVisible(parsed, petKind, { [logicIds.hasPet]: true })).toBe(true);
    expect(isQuestionnaireFieldVisible(parsed, petKind, { [logicIds.hasPet]: false })).toBe(false);
    expect(
      isQuestionnaireFieldVisible(parsed, dogName, {
        [logicIds.hasPet]: true,
        [logicIds.petKind]: logicIds.dog,
      }),
    ).toBe(true);
    // The controlling field still holds "dog" but is itself hidden: the chain collapses.
    expect(
      isQuestionnaireFieldVisible(parsed, dogName, {
        [logicIds.hasPet]: false,
        [logicIds.petKind]: logicIds.dog,
      }),
    ).toBe(false);
  });

  it("evaluates includes and notEquals, never matching an unanswered controlling field", () => {
    const newsDetail = parsed.steps[1]!.fields[2]!;
    const ratingWhy = parsed.steps[1]!.fields[4]!;
    expect(
      isQuestionnaireFieldVisible(parsed, newsDetail, {
        [logicIds.topics]: [logicIds.sport, logicIds.news],
      }),
    ).toBe(true);
    expect(
      isQuestionnaireFieldVisible(parsed, newsDetail, { [logicIds.topics]: [logicIds.sport] }),
    ).toBe(false);
    expect(isQuestionnaireFieldVisible(parsed, ratingWhy, { [logicIds.rating]: 3 })).toBe(true);
    expect(isQuestionnaireFieldVisible(parsed, ratingWhy, { [logicIds.rating]: 5 })).toBe(false);
    expect(isQuestionnaireFieldVisible(parsed, ratingWhy, {})).toBe(false);
    // An "Altro" answer is an answer different from every authored option.
    expect(
      isQuestionnaireFieldVisible(parsed, parsed.steps[1]!.fields[0]!, {
        [logicIds.hasPet]: true,
        [logicIds.petKind]: { other: "Criceto" },
      }),
    ).toBe(false);
  });

  it("hides a field whose controlling field is not part of the given definition", () => {
    const stepTwoOnly = { ...parsed, steps: [parsed.steps[1]!] };
    expect(
      isQuestionnaireFieldVisible(stepTwoOnly, parsed.steps[1]!.fields[0]!, {
        [logicIds.hasPet]: true,
        [logicIds.petKind]: logicIds.dog,
      }),
    ).toBe(false);
  });

  it("does not require hidden fields and strips their answers", () => {
    const schema = createQuestionnaireAnswersSchema(parsed);

    expect(schema.parse({ [logicIds.hasPet]: false })).toEqual({ [logicIds.hasPet]: false });
    expect(
      schema.parse({
        [logicIds.hasPet]: false,
        [logicIds.petKind]: logicIds.dog,
        [logicIds.dogName]: "Fido",
        [logicIds.ratingWhy]: 42,
      }),
    ).toEqual({ [logicIds.hasPet]: false });
  });

  it("requires and validates fields made visible by the answers", () => {
    const schema = createQuestionnaireAnswersSchema(parsed);

    const missing = schema.safeParse({ [logicIds.hasPet]: true });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues.map((issue) => issue.path)).toEqual([[logicIds.petKind]]);

    const chained = schema.safeParse({ [logicIds.hasPet]: true, [logicIds.petKind]: logicIds.dog });
    expect(chained.error?.issues.map((issue) => issue.path)).toEqual([[logicIds.dogName]]);

    expect(
      schema.parse({
        [logicIds.hasPet]: true,
        [logicIds.petKind]: logicIds.dog,
        [logicIds.dogName]: " Fido ",
        [logicIds.rating]: 5,
      }),
    ).toEqual({
      [logicIds.hasPet]: true,
      [logicIds.petKind]: logicIds.dog,
      [logicIds.dogName]: "Fido",
      [logicIds.rating]: 5,
    });
  });

  it("still rejects keys that are not fields of the definition", () => {
    const result = createQuestionnaireAnswersSchema(parsed).safeParse({
      [logicIds.hasPet]: false,
      "00000000-0000-4000-8000-000000000199": "x",
    });
    expect(result.error?.issues[0]).toMatchObject({ code: "unrecognized_keys" });
  });

  it("validates one step against the answers of the whole questionnaire", () => {
    const schema = createQuestionnaireStepAnswersSchema(parsed, logicIds.stepTwo);
    const earlier = { [logicIds.hasPet]: true, [logicIds.petKind]: logicIds.dog };

    const missing = schema.safeParse(earlier);
    expect(missing.error?.issues.map((issue) => issue.path)).toEqual([[logicIds.dogName]]);
    expect(schema.parse({ ...earlier, [logicIds.dogName]: "Fido" })).toEqual({
      [logicIds.dogName]: "Fido",
    });
    // Other steps are used for visibility only: their own problems are not reported here.
    expect(schema.safeParse({}).success).toBe(true);
    expect(
      createQuestionnaireStepAnswersSchema(parsed, logicIds.stepOne)
        .safeParse({})
        .error?.issues.map((issue) => issue.path),
    ).toEqual([[logicIds.hasPet]]);
  });

  it("keeps the legacy one-step usage working, treating cross-step conditions as hidden", () => {
    const stepTwoOnly = { ...parsed, steps: [parsed.steps[1]!] };
    expect(createQuestionnaireAnswersSchema(stepTwoOnly).safeParse({}).success).toBe(true);
  });

  it("lists the earlier eligible fields and builds a default condition", () => {
    expect(
      listQuestionnaireConditionSourceFields(parsed, logicIds.newsDetail).map((field) => field.id),
    ).toEqual([logicIds.hasPet, logicIds.petKind, logicIds.dogName, logicIds.topics]);
    expect(listQuestionnaireConditionSourceFields(parsed, logicIds.hasPet)).toEqual([]);

    const [hasPet, petKind, dogName, topics] = listQuestionnaireConditionSourceFields(
      parsed,
      logicIds.newsDetail,
    );
    expect(createQuestionnaireCondition(hasPet!)).toEqual({
      fieldId: logicIds.hasPet,
      operator: "equals",
      value: true,
    });
    expect(createQuestionnaireCondition(petKind!)?.value).toBe(logicIds.dog);
    expect(createQuestionnaireCondition(topics!)?.operator).toBe("includes");
    // Free text can only be checked for presence, so its default condition has no value.
    expect(createQuestionnaireCondition(dogName!)).toEqual({
      fieldId: logicIds.dogName,
      operator: "answered",
    });
    expect(getQuestionnaireConditionOperators(parsed.steps[1]!.fields[3]!)).toEqual(
      expect.arrayContaining(["equals", "notEquals", "greaterThan", "lessThanOrEqual", "between"]),
    );
  });

  it("clears conditions that became dangling or forward, leaving valid ones untouched", () => {
    expect(clearInvalidQuestionnaireConditions(parsed)).toBe(parsed);

    const reordered = { ...parsed, steps: [parsed.steps[1]!, parsed.steps[0]!] };
    const cleared = clearInvalidQuestionnaireConditions(reordered);
    expect(cleared.steps[0]?.fields[0]?.visibleWhen).toBeUndefined();
    expect(cleared.steps[0]?.fields[2]?.visibleWhen).toEqual(
      parsed.steps[1]?.fields[2]?.visibleWhen,
    );
    expect(questionnaireDefinitionSchema.safeParse(reordered).success).toBe(false);
    expect(questionnaireDefinitionSchema.safeParse(cleared).success).toBe(true);

    const withoutController = {
      ...parsed,
      steps: [{ ...parsed.steps[0]!, fields: [parsed.steps[0]!.fields[1]!] }, parsed.steps[1]!],
    };
    const repaired = clearInvalidQuestionnaireConditions(withoutController);
    expect(repaired.steps[0]?.fields[0]?.visibleWhen).toBeUndefined();
    expect(questionnaireDefinitionSchema.safeParse(repaired).success).toBe(true);
  });
});

describe('questionnaire "Altro (specificare)" choice', () => {
  const parsed = questionnaireDefinitionSchema.parse(logicDefinition());
  const schema = createQuestionnaireAnswersSchema(parsed);
  const base = { [logicIds.hasPet]: true };

  it("keeps option-id answers valid and unchanged", () => {
    const answers = {
      ...base,
      [logicIds.petKind]: logicIds.cat,
      [logicIds.topics]: [logicIds.sport],
    };
    expect(schema.parse(answers)).toEqual(answers);
  });

  it("accepts a trimmed free text as single choice and as one of the multiple choices", () => {
    expect(
      schema.parse({
        ...base,
        [logicIds.petKind]: { other: "  Criceto " },
        [logicIds.topics]: [logicIds.sport, { other: "Cucina" }],
      }),
    ).toEqual({
      ...base,
      [logicIds.petKind]: { other: "Criceto" },
      [logicIds.topics]: [logicIds.sport, { other: "Cucina" }],
    });
    expect(isQuestionnaireOtherAnswer({ other: "Criceto" })).toBe(true);
    expect(isQuestionnaireOtherAnswer(logicIds.cat)).toBe(false);
  });

  it("rejects empty, too long and malformed free texts, reporting them under `other`", () => {
    const empty = schema.safeParse({ ...base, [logicIds.petKind]: { other: "   " } });
    expect(empty.error?.issues[0]).toMatchObject({
      code: "too_small",
      path: [logicIds.petKind, "other"],
    });
    const long = schema.safeParse({ ...base, [logicIds.petKind]: { other: "x".repeat(21) } });
    expect(long.error?.issues[0]).toMatchObject({
      code: "too_big",
      maximum: 20,
      path: [logicIds.petKind, "other"],
    });
    expect(
      schema.safeParse({ ...base, [logicIds.petKind]: { other: "a", extra: 1 } }).success,
    ).toBe(false);
    expect(schema.safeParse({ ...base, [logicIds.petKind]: { text: "a" } }).success).toBe(false);
    expect(
      schema.safeParse({
        ...base,
        [logicIds.petKind]: logicIds.cat,
        [logicIds.topics]: [{ other: "" }],
      }).error?.issues[0]?.path,
    ).toEqual([logicIds.topics, 0, "other"]);
  });

  it("counts the free text as one selection and allows it only once", () => {
    const answers = { ...base, [logicIds.petKind]: logicIds.cat };
    expect(schema.safeParse({ ...answers, [logicIds.topics]: [{ other: "Cucina" }] }).success).toBe(
      true,
    );
    expect(
      schema.safeParse({
        ...answers,
        [logicIds.topics]: [logicIds.news, logicIds.sport, { other: "Cucina" }],
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...answers,
        [logicIds.topics]: [{ other: "Cucina" }, { other: "Viaggi" }],
      }).success,
    ).toBe(false);
  });

  it("rejects free texts on fields that do not allow them", () => {
    const strict = questionnaireDefinitionSchema.parse(
      withField(logicIds.petKind, { allowOther: false }),
    );
    expect(
      createQuestionnaireAnswersSchema(strict).safeParse({
        ...base,
        [logicIds.petKind]: { other: "Criceto" },
      }).success,
    ).toBe(false);
    const legacy = createQuestionnaireAnswersSchema(
      questionnaireDefinitionSchema.parse(definition()),
    );
    expect(
      legacy.safeParse({ [ids.text]: "Ada", [ids.boolean]: true, [ids.choice]: { other: "Verde" } })
        .success,
    ).toBe(false);
  });

  it("resolves the label and max length defaults and reserves the synthetic option id", () => {
    expect(getQuestionnaireOtherLabel(parsed.steps[0]!.fields[1] as { otherLabel?: string })).toBe(
      QUESTIONNAIRE_OTHER_DEFAULT_LABEL,
    );
    expect(getQuestionnaireOtherLabel({ otherLabel: "Altro tema" })).toBe("Altro tema");
    expect(getQuestionnaireOtherMaxLength({})).toBe(QUESTIONNAIRE_OTHER_DEFAULT_MAX_LENGTH);
    expect(
      questionnaireDefinitionSchema.safeParse(
        withField(logicIds.topics, {
          options: [{ id: QUESTIONNAIRE_OTHER_OPTION_ID, label: "Riservata" }],
        }),
      ).success,
    ).toBe(false);
  });
});
