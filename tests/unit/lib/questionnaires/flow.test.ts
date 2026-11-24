import { describe, expect, it } from "vitest";

import {
  formatAnswerForReview,
  getEstimatedMinutes,
  getFirstInvalidStepIndex,
  getQuestionnaireProgress,
  getQuestionnaireReviewSections,
  getResumeStop,
  getStepAnswerErrors,
  getVisibleQuestionnaireSteps,
  normalizeAnswersForSubmission,
  toDateTimeLocalValue,
  toIsoDateTimeValue,
  validateStepAnswers,
} from "@/lib/questionnaires/flow";
import {
  createQuestionnaireAnswersSchema,
  questionnaireDefinitionSchema,
} from "@/lib/server/modules/questionnaires/schema/definition";

import type { QuestionnaireDefinition } from "@/lib/server/modules/questionnaires/schema/definition";

let idCounter = 0;
function id() {
  idCounter += 1;
  return `00000000-0000-4000-8000-${String(idCounter).padStart(12, "0")}`;
}

const copy = {
  progressLabel: "Progresso",
  backLabel: "Indietro",
  nextLabel: "Avanti",
  submitLabel: "Invia",
  requiredFieldsMessage: "Compila i campi obbligatori.",
  resumeMessage: "Riprendi",
  successTitle: "Grazie",
  successMessage: "Risposte inviate.",
  alreadySubmittedTitle: "Gia inviato",
  alreadySubmittedMessage: "Hai gia risposto.",
  closedTitle: "Chiuso",
  closedMessage: "Il questionario e chiuso.",
  resultsTitle: "Risultati",
  resultsEmptyMessage: "Nessun risultato.",
};

type FieldInput = { type: string; id?: string; required?: boolean } & Record<string, unknown>;

function defineQuestionnaire(steps: FieldInput[][]): QuestionnaireDefinition {
  return questionnaireDefinitionSchema.parse({
    version: 1,
    copy,
    steps: steps.map((fields, index) => ({
      id: id(),
      title: `Sezione ${index + 1}`,
      fields: fields.map((field) => ({ id: id(), label: "Domanda", ...field })),
    })),
  });
}

function messageFor(field: FieldInput, value: unknown) {
  const definition = defineQuestionnaire([[field]]);
  const [step] = definition.steps;
  const fieldId = step.fields[0].id;
  const answers = value === undefined ? {} : { [fieldId]: value };
  return validateStepAnswers(definition, step, answers)[fieldId];
}

describe("datetime conversion", () => {
  it("round-trips a datetime-local value through ISO", () => {
    const iso = toIsoDateTimeValue("2026-03-10T14:30");

    expect(iso).toBe(new Date("2026-03-10T14:30").toISOString());
    expect(toDateTimeLocalValue(iso)).toBe("2026-03-10T14:30");
  });

  it("returns an empty string for empty or unparseable values instead of throwing", () => {
    expect(toIsoDateTimeValue("")).toBe("");
    expect(toIsoDateTimeValue("non una data")).toBe("");
    expect(toDateTimeLocalValue("")).toBe("");
    expect(toDateTimeLocalValue("non una data")).toBe("");
  });
});

describe("normalizeAnswersForSubmission", () => {
  it("converts datetime answers to ISO strings accepted by the answers schema", () => {
    const definition = defineQuestionnaire([[{ type: "datetime", required: true }]]);
    const fieldId = definition.steps[0].fields[0].id;

    const normalized = normalizeAnswersForSubmission(definition, { [fieldId]: "2026-03-10T14:30" });

    expect(normalized[fieldId]).toBe(new Date("2026-03-10T14:30").toISOString());
    expect(createQuestionnaireAnswersSchema(definition).safeParse(normalized).success).toBe(true);
  });

  it("omits empty answers, unknown keys and information fields", () => {
    const definition = defineQuestionnaire([
      [
        { type: "text" },
        { type: "email" },
        { type: "multipleChoice", options: [{ id: id(), label: "A" }] },
        { type: "integer" },
        { type: "datetime" },
        { type: "boolean", trueLabel: "Si", falseLabel: "No" },
        { type: "information" },
      ],
    ]);
    const [text, email, choice, integer, datetime, boolean, information] =
      definition.steps[0].fields.map((field) => field.id);

    const normalized = normalizeAnswersForSubmission(definition, {
      [text]: "   ",
      [email]: "",
      [choice]: [],
      [integer]: Number.NaN,
      [datetime]: "",
      [boolean]: false,
      [information]: "x",
      sconosciuto: "x",
    });

    expect(normalized).toEqual({ [boolean]: false });
    expect(createQuestionnaireAnswersSchema(definition).safeParse(normalized).success).toBe(true);
  });

  it("keeps an unchecked optional consent but drops an unchecked required one", () => {
    const definition = defineQuestionnaire([
      [
        { type: "consent", consentText: "Accetto", required: false },
        { type: "consent", consentText: "Accetto", required: true },
      ],
    ]);
    const [optional, required] = definition.steps[0].fields.map((field) => field.id);

    expect(
      normalizeAnswersForSubmission(definition, { [optional]: false, [required]: false }),
    ).toEqual({ [optional]: false });
  });
});

describe("validateStepAnswers", () => {
  it("returns an empty object when the step is valid", () => {
    const definition = defineQuestionnaire([
      [{ type: "text", required: true }, { type: "email" }, { type: "information" }],
    ]);
    const [step] = definition.steps;

    expect(validateStepAnswers(definition, step, { [step.fields[0].id]: "Ciao" })).toEqual({});
  });

  it("only validates the given step and ignores answers of other steps", () => {
    const definition = defineQuestionnaire([
      [{ type: "text", required: true }],
      [{ type: "text", required: true }],
    ]);
    const [first, second] = definition.steps;

    expect(validateStepAnswers(definition, first, { [first.fields[0].id]: "Ciao" })).toEqual({});
    expect(validateStepAnswers(definition, second, { [first.fields[0].id]: "Ciao" })).toEqual({
      [second.fields[0].id]: "Campo obbligatorio.",
    });
  });

  it.each<[string, FieldInput, unknown]>([
    ["missing text", { type: "text" }, undefined],
    ["blank text", { type: "textarea", minLength: 10 }, "   "],
    ["missing number", { type: "integer", min: 3 }, undefined],
    ["missing boolean", { type: "boolean", trueLabel: "Si", falseLabel: "No" }, undefined],
    ["unchecked consent", { type: "consent", consentText: "Accetto" }, false],
    ["missing date", { type: "date" }, ""],
    ["missing datetime", { type: "datetime" }, ""],
    ["missing email", { type: "email" }, ""],
    ["missing single choice", { type: "singleChoice", options: [] }, undefined],
    ["empty multiple choice", { type: "multipleChoice", options: [], minSelections: 2 }, []],
    ["missing scale", { type: "scale", min: 1, max: 5 }, undefined],
  ])("reports a required %s as mandatory", (_label, field, value) => {
    expect(messageFor({ ...field, required: true }, value)).toBe("Campo obbligatorio.");
  });

  it("accepts cleared optional fields", () => {
    expect(messageFor({ type: "text", minLength: 5 }, "")).toBeUndefined();
    expect(messageFor({ type: "email" }, "")).toBeUndefined();
    expect(messageFor({ type: "date" }, "")).toBeUndefined();
    expect(
      messageFor({ type: "multipleChoice", options: [], minSelections: 2 }, []),
    ).toBeUndefined();
  });

  it("explains number bounds", () => {
    expect(messageFor({ type: "integer", min: 18 }, 3)).toBe(
      "Inserisci un valore non inferiore a 18.",
    );
    expect(messageFor({ type: "decimal", max: 9.5 }, 10)).toBe(
      "Inserisci un valore non superiore a 9.5.",
    );
    expect(messageFor({ type: "scale", min: 1, max: 5 }, 0)).toBe(
      "Inserisci un valore non inferiore a 1.",
    );
  });

  it("asks for a whole number on integer fields", () => {
    expect(messageFor({ type: "integer", min: 3 }, 4.5)).toBe("Inserisci un numero intero.");
  });

  it("explains text length bounds", () => {
    expect(messageFor({ type: "text", minLength: 5 }, "abc")).toBe("Inserisci almeno 5 caratteri.");
    expect(messageFor({ type: "textarea", maxLength: 4 }, "abcdef")).toBe(
      "Inserisci al massimo 4 caratteri.",
    );
  });

  it("explains selection bounds", () => {
    const options = [
      { id: id(), label: "A" },
      { id: id(), label: "B" },
      { id: id(), label: "C" },
    ];
    const [a, b, c] = options.map((option) => option.id);

    expect(messageFor({ type: "multipleChoice", options, minSelections: 2 }, [a])).toBe(
      "Seleziona almeno 2 opzioni.",
    );
    expect(
      messageFor({ type: "multipleChoice", options, minSelections: 2, required: true }, [a]),
    ).toBe("Seleziona almeno 2 opzioni.");
    expect(messageFor({ type: "multipleChoice", options, maxSelections: 2 }, [a, b, c])).toBe(
      "Seleziona al massimo 2 opzioni.",
    );
    expect(messageFor({ type: "multipleChoice", options, maxSelections: 1 }, [a, b])).toBe(
      "Seleziona al massimo 1 opzione.",
    );
  });

  it("rejects options that do not belong to the field", () => {
    const options = [{ id: id(), label: "A" }];
    const message = "Seleziona una delle opzioni disponibili.";

    expect(messageFor({ type: "singleChoice", options }, id())).toBe(message);
    expect(messageFor({ type: "singleChoice", options }, "non-un-id")).toBe(message);
    expect(messageFor({ type: "multipleChoice", options }, [options[0].id, options[0].id])).toBe(
      message,
    );
  });

  it("explains invalid email and url values", () => {
    expect(messageFor({ type: "email" }, "mario@")).toBe("Inserisci un indirizzo email valido.");
    expect(messageFor({ type: "url" }, "non un sito")).toBe(
      "Inserisci un indirizzo web valido, completo di https://.",
    );
  });

  it("explains date bounds and invalid dates", () => {
    const field = { type: "date", min: "2026-01-10", max: "2026-12-31" };

    expect(messageFor(field, "2026-01-09")).toBe(
      "Inserisci una data non precedente al 10/01/2026.",
    );
    expect(messageFor(field, "2027-01-01")).toBe(
      "Inserisci una data non successiva al 31/12/2026.",
    );
    expect(messageFor(field, "2026-01-10")).toBeUndefined();
    expect(messageFor(field, "10/01/2026")).toBe("Inserisci una data valida.");
  });

  it("explains datetime bounds", () => {
    const field = {
      type: "datetime",
      min: "2026-01-10T08:00:00.000Z",
      max: "2026-01-20T08:00:00.000Z",
    };

    expect(messageFor(field, "2026-01-09T08:00:00.000Z")).toMatch(
      /^Inserisci una data non precedente al .*26.*\.$/,
    );
    expect(messageFor(field, "2026-01-21T08:00:00.000Z")).toMatch(
      /^Inserisci una data non successiva al .*26.*\.$/,
    );
    expect(messageFor(field, "2026-01-15T08:00:00.000Z")).toBeUndefined();
  });

  it("falls back to the generic message for values of the wrong type", () => {
    expect(messageFor({ type: "boolean", trueLabel: "Si", falseLabel: "No" }, "si")).toBe(
      "Controlla il valore inserito.",
    );
  });
});

describe("getResumeStop", () => {
  const definition = defineQuestionnaire([
    [{ type: "text", required: true }],
    [{ type: "text" }, { type: "boolean", trueLabel: "Si", falseLabel: "No" }],
    [{ type: "text", required: true }],
    [{ type: "textarea" }],
  ]);
  const fieldId = (stepIndex: number, fieldIndex = 0) =>
    definition.steps[stepIndex].fields[fieldIndex].id;

  describe("with a saved step index", () => {
    it("resumes on the saved step", () => {
      const answers = { [fieldId(0)]: "a", [fieldId(2)]: "c" };

      expect(getResumeStop(definition, { answers, stepIndex: 2 })).toBe(2);
      expect(getResumeStop(definition, { answers, stepIndex: 0 })).toBe(0);
    });

    it("resumes on an optional-only step the user was on, even if untouched", () => {
      expect(getResumeStop(definition, { answers: { [fieldId(0)]: "a" }, stepIndex: 1 })).toBe(1);
    });

    it("never goes beyond the first step failing validation", () => {
      expect(getResumeStop(definition, { answers: { [fieldId(0)]: "a" }, stepIndex: 3 })).toBe(2);
      expect(getResumeStop(definition, { answers: {}, stepIndex: 2 })).toBe(0);
    });

    it("clamps out-of-range and fractional indexes", () => {
      const answers = { [fieldId(0)]: "a", [fieldId(2)]: "c" };

      expect(getResumeStop(definition, { answers, stepIndex: 3 })).toBe(3);
      expect(getResumeStop(definition, { answers, stepIndex: -4 })).toBe(0);
      expect(getResumeStop(definition, { answers, stepIndex: 1.7 })).toBe(1);
    });
  });

  describe("without a saved step index (legacy drafts)", () => {
    it("stops at an optional-only step that has no answers", () => {
      expect(getResumeStop(definition, { answers: { [fieldId(0)]: "a" } })).toBe(1);
    });

    it("moves past an optional-only step once one of its questions is answered", () => {
      expect(
        getResumeStop(definition, { answers: { [fieldId(0)]: "a", [fieldId(1, 1)]: false } }),
      ).toBe(2);
    });

    it("stops at the first step failing validation", () => {
      expect(getResumeStop(definition, { answers: {} })).toBe(0);
      expect(
        getResumeStop(definition, {
          answers: { [fieldId(0)]: "   ", [fieldId(1)]: "b", [fieldId(2)]: "c" },
        }),
      ).toBe(0);
    });

    it("does not land on the last step just because its questions are optional", () => {
      const answers = { [fieldId(0)]: "a", [fieldId(1)]: "b" };

      expect(getResumeStop(definition, { answers })).toBe(2);
      expect(getResumeStop(definition, { answers: { ...answers, [fieldId(2)]: "c" } })).toBe(3);
    });

    it("falls back to the last step when everything is answered", () => {
      const answers = {
        [fieldId(0)]: "a",
        [fieldId(1)]: "b",
        [fieldId(2)]: "c",
        [fieldId(3)]: "d",
      };

      expect(getResumeStop(definition, { answers })).toBe(3);
    });

    it("skips steps that contain no questions", () => {
      const withIntro = defineQuestionnaire([
        [{ type: "information" }],
        [{ type: "text", required: true }],
      ]);

      expect(getResumeStop(withIntro, { answers: {} })).toBe(1);
    });
  });

  it("opens the review for a questionnaire without steps", () => {
    expect(getResumeStop(defineQuestionnaire([]), { answers: {} })).toBe("review");
  });

  describe("review", () => {
    const answers = { [fieldId(0)]: "a", [fieldId(2)]: "c" };

    it("resumes on the review when the saved index is past the last step and all is valid", () => {
      expect(getResumeStop(definition, { answers, stepIndex: 4 })).toBe("review");
      expect(getResumeStop(definition, { answers, stepIndex: 99 })).toBe("review");
    });

    it("falls back to the first incomplete step otherwise", () => {
      expect(getResumeStop(definition, { answers: { [fieldId(0)]: "a" }, stepIndex: 4 })).toBe(2);
    });
  });
});

describe("getEstimatedMinutes", () => {
  const repeat = (count: number, field: FieldInput) => Array.from({ length: count }, () => field);
  const boolean = { type: "boolean", trueLabel: "Si", falseLabel: "No" };

  it("never goes below one minute", () => {
    expect(getEstimatedMinutes(defineQuestionnaire([]))).toBe(1);
    expect(getEstimatedMinutes(defineQuestionnaire([[boolean]]))).toBe(1);
  });

  it("weights open answers much more than quick ones", () => {
    const quick = getEstimatedMinutes(defineQuestionnaire([repeat(10, boolean)]));
    const open = getEstimatedMinutes(defineQuestionnaire([repeat(10, { type: "textarea" })]));

    expect(quick).toBe(1);
    expect(open).toBe(10);
  });

  it("counts a little reading time for information fields", () => {
    expect(getEstimatedMinutes(defineQuestionnaire([repeat(30, { type: "information" })]))).toBe(4);
  });

  it("grows with the number of options of a choice question", () => {
    const options = (count: number) =>
      Array.from({ length: count }, () => ({ id: id(), label: "Opzione" }));
    const choices = (count: number) =>
      Array.from({ length: 10 }, () => ({ type: "singleChoice", options: options(count) }));
    const few = defineQuestionnaire([choices(2)]);
    const many = defineQuestionnaire([choices(10)]);

    expect(getEstimatedMinutes(many)).toBeGreaterThan(getEstimatedMinutes(few));
  });

  it("sums fields across steps", () => {
    const definition = defineQuestionnaire([
      repeat(2, { type: "textarea" }),
      repeat(3, { type: "text" }),
    ]);

    expect(getEstimatedMinutes(definition)).toBe(3);
  });
});

describe("conditional questions", () => {
  const yes = { type: "boolean", trueLabel: "Si", falseLabel: "No" };
  const controllerId = id();
  const optionId = id();
  const definition = defineQuestionnaire([
    [{ ...yes, id: controllerId, required: true }],
    [
      {
        type: "text",
        required: true,
        visibleWhen: { fieldId: controllerId, operator: "equals", value: true },
      },
      {
        type: "singleChoice",
        options: [{ id: optionId, label: "A" }],
        visibleWhen: { fieldId: controllerId, operator: "equals", value: true },
      },
    ],
    [{ type: "text" }],
  ]);
  const [, conditionalStep, lastStep] = definition.steps;
  const [conditionalText, conditionalChoice] = conditionalStep.fields.map((field) => field.id);
  const lastText = lastStep.fields[0].id;

  it("validates a required conditional field controlled from an earlier step", () => {
    expect(validateStepAnswers(definition, conditionalStep, { [controllerId]: true })).toEqual({
      [conditionalText]: "Campo obbligatorio.",
    });
    expect(validateStepAnswers(definition, conditionalStep, { [controllerId]: false })).toEqual({});
    expect(validateStepAnswers(definition, conditionalStep, {})).toEqual({});
  });

  it("does not submit answers of hidden fields", () => {
    const answers = { [controllerId]: false, [conditionalText]: "nascosta", [lastText]: "x" };

    expect(normalizeAnswersForSubmission(definition, answers)).toEqual({
      [controllerId]: false,
      [lastText]: "x",
    });
    expect(normalizeAnswersForSubmission(definition, { ...answers, [controllerId]: true })).toEqual(
      { [controllerId]: true, [conditionalText]: "nascosta", [lastText]: "x" },
    );
  });

  it("lists only the steps that have a visible field", () => {
    const indexes = (answers: Record<string, unknown>) =>
      getVisibleQuestionnaireSteps(definition, answers).map(({ stepIndex }) => stepIndex);

    expect(indexes({})).toEqual([0, 2]);
    expect(indexes({ [controllerId]: false })).toEqual([0, 2]);
    expect(indexes({ [controllerId]: true })).toEqual([0, 1, 2]);
    expect(
      getVisibleQuestionnaireSteps(definition, { [controllerId]: true })[1].fields.map(
        (field) => field.id,
      ),
    ).toEqual([conditionalText, conditionalChoice]);
  });

  it("counts answered questions among the visible ones", () => {
    expect(getQuestionnaireProgress(definition, {})).toEqual({ answered: 0, total: 2 });
    expect(
      getQuestionnaireProgress(definition, { [controllerId]: false, [conditionalText]: "x" }),
    ).toEqual({ answered: 1, total: 2 });
    expect(
      getQuestionnaireProgress(definition, {
        [controllerId]: true,
        [conditionalText]: "x",
        [conditionalChoice]: "",
        [lastText]: "  ",
      }),
    ).toEqual({ answered: 2, total: 4 });
  });

  it("does not count information fields as questions", () => {
    const withInformation = defineQuestionnaire([[{ type: "information" }, { type: "text" }]]);

    expect(getQuestionnaireProgress(withInformation, {})).toEqual({ answered: 0, total: 1 });
  });

  it("finds the first step that still needs an answer", () => {
    expect(getFirstInvalidStepIndex(definition, {})).toBe(0);
    expect(getFirstInvalidStepIndex(definition, { [controllerId]: true })).toBe(1);
    expect(getFirstInvalidStepIndex(definition, { [controllerId]: false })).toBe(-1);
  });

  it("never resumes on a step without visible fields", () => {
    const hidden = { [controllerId]: false };

    expect(getResumeStop(definition, { answers: hidden, stepIndex: 1 })).toBe(2);
    expect(getResumeStop(definition, { answers: hidden })).toBe(2);
    expect(getResumeStop(definition, { answers: { [controllerId]: true }, stepIndex: 2 })).toBe(1);
    expect(getResumeStop(definition, { answers: { [controllerId]: true } })).toBe(1);
  });

  it("weighs conditional questions for half in the estimate", () => {
    const repeat = (field: FieldInput) => Array.from({ length: 10 }, () => field);
    const always = defineQuestionnaire([[{ ...yes, id: id() }], repeat({ type: "textarea" })]);
    const sourceId = id();
    const conditional = defineQuestionnaire([
      [{ ...yes, id: sourceId }],
      repeat({
        type: "textarea",
        visibleWhen: { fieldId: sourceId, operator: "equals", value: true },
      }),
    ]);

    expect(getEstimatedMinutes(always)).toBe(10);
    expect(getEstimatedMinutes(conditional)).toBe(5);
  });
});

describe('"Altro" choice', () => {
  const options = [
    { id: id(), label: "Alfa" },
    { id: id(), label: "Beta" },
  ];
  const [alfa, beta] = options.map((option) => option.id);
  const single = { type: "singleChoice", options, allowOther: true, otherMaxLength: 5 };
  const multiple = { type: "multipleChoice", options, allowOther: true, otherLabel: "Altro mezzo" };

  it("asks to specify the answer when the text is missing", () => {
    expect(messageFor(single, { other: "" })).toBe("Specifica la risposta.");
    expect(messageFor({ ...single, required: true }, { other: "   " })).toBe(
      "Specifica la risposta.",
    );
    expect(messageFor(multiple, [alfa, { other: " " }])).toBe("Specifica la risposta.");
  });

  it("explains the maximum length of the text", () => {
    expect(messageFor(single, { other: "troppo lungo" })).toBe("Inserisci al massimo 5 caratteri.");
  });

  it("accepts a filled text", () => {
    expect(messageFor(single, { other: " ok " })).toBeUndefined();
    expect(messageFor(multiple, [beta, { other: "Bici" }])).toBeUndefined();
  });

  it("tells whether the error belongs to the text or to the field", () => {
    const definition = defineQuestionnaire([[single, { type: "text", required: true }]]);
    const [step] = definition.steps;
    const [choiceId, textId] = step.fields.map((field) => field.id);

    expect(getStepAnswerErrors(definition, step, { [choiceId]: { other: "" } })).toEqual({
      [choiceId]: { message: "Specifica la risposta.", target: "other" },
      [textId]: { message: "Campo obbligatorio.", target: "field" },
    });
  });

  it("trims the text and keeps an empty one so that validation can ask for it", () => {
    const definition = defineQuestionnaire([[single], [multiple]]);
    const [singleId, multipleId] = definition.steps.map((step) => step.fields[0].id);

    expect(
      normalizeAnswersForSubmission(definition, {
        [singleId]: { other: "  Bici " },
        [multipleId]: [alfa, { other: " " }],
      }),
    ).toEqual({ [singleId]: { other: "Bici" }, [multipleId]: [alfa, { other: "" }] });
  });

  it("drops the text when the field does not offer the choice", () => {
    const definition = defineQuestionnaire([
      [{ type: "singleChoice", options, required: true }],
      [{ type: "multipleChoice", options }],
    ]);
    const [step] = definition.steps;
    const [singleId, multipleId] = definition.steps.map((current) => current.fields[0].id);
    const answers = { [singleId]: { other: "x" }, [multipleId]: [alfa, { other: "x" }] };

    expect(normalizeAnswersForSubmission(definition, answers)).toEqual({ [multipleId]: [alfa] });
    expect(validateStepAnswers(definition, step, answers)).toEqual({
      [singleId]: "Campo obbligatorio.",
    });
  });

  it("does not count a choice without its text as answered", () => {
    const definition = defineQuestionnaire([[single], [multiple]]);
    const [singleId, multipleId] = definition.steps.map((step) => step.fields[0].id);

    expect(
      getQuestionnaireProgress(definition, {
        [singleId]: { other: " " },
        [multipleId]: [{ other: "" }],
      }),
    ).toEqual({ answered: 0, total: 2 });
    expect(
      getQuestionnaireProgress(definition, {
        [singleId]: { other: "Bici" },
        [multipleId]: [alfa, { other: "" }],
      }),
    ).toEqual({ answered: 2, total: 2 });
  });
});

describe("review", () => {
  const options = [
    { id: id(), label: "Alfa" },
    { id: id(), label: "Beta" },
  ];
  const [alfa, beta] = options.map((option) => option.id);
  const fieldOf = (field: FieldInput) => defineQuestionnaire([[field]]).steps[0].fields[0];
  const format = (field: FieldInput, value: unknown) =>
    formatAnswerForReview(fieldOf(field), value);

  it("formats each kind of answer", () => {
    const boolean = { type: "boolean", trueLabel: "Certo", falseLabel: "Per niente" };

    expect(format({ type: "text" }, "  Ciao ")).toBe("Ciao");
    expect(format({ type: "decimal" }, 9.5)).toBe("9,5");
    expect(format({ type: "scale", min: 1, max: 5 }, 4)).toBe("4");
    expect(format(boolean, true)).toBe("Certo");
    expect(format(boolean, false)).toBe("Per niente");
    expect(format({ type: "consent", consentText: "Accetto" }, true)).toBe("Sì");
    expect(format({ type: "consent", consentText: "Accetto" }, false)).toBe("No");
    expect(format({ type: "date" }, "2026-03-10")).toBe("10/03/2026");
    expect(format({ type: "datetime" }, new Date("2026-03-10T14:30").toISOString())).toMatch(
      /10\/03\/26.*14:30/,
    );
    expect(format({ type: "singleChoice", options }, beta)).toBe("Beta");
    expect(format({ type: "multipleChoice", options }, [beta, alfa])).toBe("Beta, Alfa");
  });

  it('formats the "Altro" choice with its label and text', () => {
    expect(format({ type: "singleChoice", options, allowOther: true }, { other: " Bici " })).toBe(
      "Altro: Bici",
    );
    expect(
      format({ type: "multipleChoice", options, allowOther: true, otherLabel: "Altro mezzo" }, [
        alfa,
        { other: "Bici" },
      ]),
    ).toBe("Alfa, Altro mezzo: Bici");
  });

  it("returns null for missing or unusable answers", () => {
    expect(format({ type: "text" }, "   ")).toBeNull();
    expect(format({ type: "integer" }, undefined)).toBeNull();
    expect(format({ type: "multipleChoice", options }, [])).toBeNull();
    expect(format({ type: "singleChoice", options }, id())).toBeNull();
    expect(format({ type: "singleChoice", options, allowOther: true }, { other: " " })).toBeNull();
    expect(format({ type: "consent", consentText: "Accetto", required: true }, false)).toBeNull();
    expect(format({ type: "information" }, "x")).toBeNull();
  });

  it("groups the visible questions by step", () => {
    const controllerId = id();
    const definition = defineQuestionnaire([
      [
        { type: "information" },
        { type: "boolean", id: controllerId, trueLabel: "Si", falseLabel: "No" },
      ],
      [{ type: "information" }],
      [
        {
          type: "text",
          visibleWhen: { fieldId: controllerId, operator: "equals", value: true },
        },
      ],
      [{ type: "text" }],
    ]);
    const hiddenId = definition.steps[2].fields[0].id;
    const lastId = definition.steps[3].fields[0].id;
    const summarize = (answers: Record<string, unknown>) =>
      getQuestionnaireReviewSections(definition, answers).map(({ stepIndex, items }) => [
        stepIndex,
        items.map(({ field, answer }) => [field.id, answer]),
      ]);

    expect(summarize({ [controllerId]: false, [hiddenId]: "nascosta" })).toEqual([
      [0, [[controllerId, "No"]]],
      [3, [[lastId, null]]],
    ]);
    expect(summarize({ [controllerId]: true, [hiddenId]: "visibile", [lastId]: "fine" })).toEqual([
      [0, [[controllerId, "Si"]]],
      [2, [[hiddenId, "visibile"]]],
      [3, [[lastId, "fine"]]],
    ]);
  });
});
