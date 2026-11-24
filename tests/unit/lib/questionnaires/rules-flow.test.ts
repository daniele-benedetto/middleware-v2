import { describe, expect, it } from "vitest";

import {
  getEstimatedMinutes,
  getQuestionnaireProgress,
  getResumeStop,
  getStepAnswerErrors,
  getVisibleQuestionnaireSteps,
  normalizeAnswersForSubmission,
} from "@/lib/questionnaires/flow";
import {
  formatQuestionnaireAudience,
  formatQuestionnaireRule,
} from "@/lib/questionnaires/rule-format";
import { questionnaireDefinitionSchema } from "@/lib/server/modules/questionnaires/schema/definition";

const uuid = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const ids = {
  contact: uuid(1),
  phone: uuid(2),
  plan: uuid(3),
  free: uuid(4),
  pro: uuid(5),
  score: uuid(6),
  reason: uuid(7),
  extra: uuid(8),
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

const definition = questionnaireDefinitionSchema.parse({
  version: 1,
  copy,
  steps: [
    {
      id: uuid(100),
      title: "Contatti",
      endWhen: { fieldId: ids.score, operator: "lessThan", value: 3 },
      fields: [
        { id: ids.contact, type: "consent", label: "Ricontattami", consentText: "Si" },
        {
          id: ids.phone,
          type: "phone",
          label: "Telefono",
          requiredWhen: { fieldId: ids.contact, operator: "equals", value: true },
        },
        {
          id: ids.plan,
          type: "singleChoice",
          label: "Piano",
          options: [
            { id: ids.free, label: "Gratis" },
            {
              id: ids.pro,
              label: "Pro",
              visibleWhen: { fieldId: ids.contact, operator: "equals", value: true },
            },
          ],
        },
        { id: ids.score, type: "scale", label: "Voto", min: 1, max: 5 },
      ],
    },
    {
      id: uuid(101),
      title: "Dettagli",
      visibleWhen: { fieldId: ids.plan, operator: "answered" },
      fields: [{ id: ids.reason, type: "text", label: "Motivo", required: true }],
    },
    {
      id: uuid(102),
      title: "Extra",
      fields: [{ id: ids.extra, type: "text", label: "Altro da dire" }],
    },
  ],
});

const firstStepFields = (answers: Record<string, unknown>) =>
  getVisibleQuestionnaireSteps(definition, answers)[0]!.fields;

describe("questionnaire flow with rules", () => {
  it("presents required and options as the respondent must see them", () => {
    const plain = firstStepFields({});
    expect(plain.find((field) => field.id === ids.phone)?.required).toBe(false);
    expect(plain.find((field) => field.id === ids.plan)).toMatchObject({
      options: [{ id: ids.free }],
    });

    const contacted = firstStepFields({ [ids.contact]: true });
    expect(contacted.find((field) => field.id === ids.phone)?.required).toBe(true);
    expect(contacted.find((field) => field.id === ids.plan)).toMatchObject({
      options: [{ id: ids.free }, { id: ids.pro }],
    });
  });

  it("asks for a field made mandatory by requiredWhen", () => {
    const step = definition.steps[0]!;
    expect(getStepAnswerErrors(definition, step, {})).toEqual({});
    expect(Object.keys(getStepAnswerErrors(definition, step, { [ids.contact]: true }))).toEqual([
      ids.phone,
    ]);
  });

  it("drops a choice whose option is not offered any more", () => {
    const picked = { [ids.contact]: true, [ids.phone]: "333", [ids.plan]: ids.pro };
    expect(normalizeAnswersForSubmission(definition, picked)).toMatchObject({
      [ids.plan]: ids.pro,
    });
    const withdrawn = normalizeAnswersForSubmission(definition, {
      ...picked,
      [ids.contact]: false,
    });
    expect(withdrawn[ids.plan]).toBeUndefined();
    expect(getQuestionnaireProgress(definition, { ...picked, [ids.contact]: false }).answered).toBe(
      2,
    );
  });

  it("skips a hidden step and everything after an ending step", () => {
    const titles = (answers: Record<string, unknown>) =>
      getVisibleQuestionnaireSteps(definition, answers).map(({ step }) => step.title);

    expect(titles({})).toEqual(["Contatti", "Extra"]);
    expect(titles({ [ids.plan]: ids.free })).toEqual(["Contatti", "Dettagli", "Extra"]);
    expect(titles({ [ids.plan]: ids.free, [ids.score]: 2 })).toEqual(["Contatti"]);
    expect(getResumeStop(definition, { answers: { [ids.score]: 2 }, stepIndex: 3 })).toBe("review");
    expect(normalizeAnswersForSubmission(definition, { [ids.score]: 2, [ids.extra]: "x" })).toEqual(
      {
        [ids.score]: 2,
      },
    );
  });

  it("weighs the questions of a conditional step as conditional", () => {
    expect(getEstimatedMinutes(definition)).toBeGreaterThanOrEqual(1);
  });
});

describe("questionnaire rule wording", () => {
  it("formats conditions for people", () => {
    expect(
      formatQuestionnaireRule({
        match: "any",
        conditions: [
          { fieldLabel: "Voto", operator: "between", valueKind: "number", values: [2, 4] },
          {
            fieldLabel: "Piano",
            operator: "isOneOf",
            valueKind: "text",
            values: ["Gratis", "Pro"],
          },
          { fieldLabel: "Giorno", operator: "lessThan", valueKind: "date", values: ["2026-06-01"] },
          { fieldLabel: "Consenso", operator: "equals", valueKind: "consent", values: [0] },
          { fieldLabel: "Nome", operator: "notAnswered", valueKind: "none", values: [] },
        ],
      }),
    ).toBe(
      "«Voto» è compresa tra 2 e 4 oppure «Piano» è una tra «Gratis», «Pro» oppure " +
        "«Giorno» è precedente al 01/06/2026 oppure «Consenso» non è accettato oppure " +
        "«Nome» non ha una risposta",
    );
  });

  it("formats who a conditional question was shown to", () => {
    expect(
      formatQuestionnaireAudience({
        shownCount: 85,
        totalCount: 137,
        rules: [
          {
            match: "all",
            conditions: [
              { fieldLabel: "Accordo", operator: "equals", valueKind: "text", values: ["Sì"] },
            ],
          },
        ],
      }),
    ).toEqual({ shown: "Mostrata a 85 su 137", condition: "Solo se «Accordo» è uguale a «Sì»" });
    expect(
      formatQuestionnaireAudience({ shownCount: 1, totalCount: 2, rules: [] }).condition,
    ).toBeNull();
    expect(
      formatQuestionnaireAudience({
        shownCount: 1,
        totalCount: 2,
        rules: [],
        endRules: [
          {
            match: "all",
            conditions: [
              { fieldLabel: "Voto", operator: "equals", valueKind: "number", values: [1] },
            ],
          },
        ],
      }).condition,
    ).toBe("Non mostrata a chi ha terminato prima il questionario («Voto» è uguale a 1)");
  });
});
