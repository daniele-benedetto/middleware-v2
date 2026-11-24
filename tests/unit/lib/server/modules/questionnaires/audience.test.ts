import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/server/http/api-error";
import { createQuestionnaireResponsesCsv } from "@/lib/server/modules/questionnaires/csv";
import { questionnaireDefinitionSchema } from "@/lib/server/modules/questionnaires/schema";
import { toPublicQuestionnaireAnalysis } from "@/lib/server/modules/questionnaires/service/analysis";
import { createQuestionnaireFieldAudiences } from "@/lib/server/modules/questionnaires/service/audience";
import {
  filterResponsesByRule,
  summarizeQuestionnaireFields,
} from "@/lib/server/modules/questionnaires/service/summary";

const uuid = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const ids = { happy: uuid(1), why: uuid(2), score: uuid(3), after: uuid(4), tail: uuid(5) };
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

const rawDefinition = {
  version: 1,
  copy,
  steps: [
    {
      id: uuid(100),
      title: "Uno",
      endWhen: { fieldId: ids.score, operator: "equals", value: 1 },
      fields: [
        {
          id: ids.happy,
          type: "boolean",
          label: "Contento?",
          publicResults: true,
          trueLabel: "Sì",
          falseLabel: "No",
        },
        {
          id: ids.why,
          type: "scale",
          label: "Quanto?",
          publicResults: true,
          min: 1,
          max: 5,
          visibleWhen: { fieldId: ids.happy, operator: "equals", value: true },
        },
        { id: ids.score, type: "scale", label: "Voto", min: 1, max: 5 },
      ],
    },
    {
      id: uuid(101),
      title: "Due",
      visibleWhen: { fieldId: ids.score, operator: "greaterThanOrEqual", value: 4 },
      fields: [{ id: ids.after, type: "text", label: "Racconta" }],
    },
    { id: uuid(102), title: "Tre", fields: [{ id: ids.tail, type: "text", label: "Coda" }] },
  ],
};
const definition = questionnaireDefinitionSchema.parse(rawDefinition);

const responses = [
  { answers: { [ids.happy]: true, [ids.why]: 4, [ids.score]: 5, [ids.after]: "Bene" } },
  { answers: { [ids.happy]: true, [ids.score]: 3 } },
  { answers: { [ids.happy]: false, [ids.score]: 1 } },
  { answers: {} },
].map((response, index) => ({
  ...response,
  id: uuid(200 + index),
  submittedAt: new Date(Date.UTC(2026, 0, index + 1)),
}));

describe("questionnaire field audiences", () => {
  const audiences = createQuestionnaireFieldAudiences(definition, responses);

  it("tells who each conditional field was shown to and why", () => {
    expect(audiences.has(ids.happy)).toBe(false);
    expect(audiences.get(ids.why)).toEqual({
      shownCount: 2,
      totalCount: 4,
      rules: [
        {
          match: "all",
          conditions: [
            { fieldLabel: "Contento?", operator: "equals", valueKind: "text", values: ["Sì"] },
          ],
        },
      ],
    });
    expect(audiences.get(ids.after)).toMatchObject({ shownCount: 1, totalCount: 4 });
    expect(audiences.get(ids.tail)).toEqual({
      shownCount: 3,
      totalCount: 4,
      rules: [],
      endRules: [
        {
          match: "all",
          conditions: [
            { fieldLabel: "Voto", operator: "equals", valueKind: "number", values: [1] },
          ],
        },
      ],
    });
  });

  it("exposes the audience in the CMS summary only", () => {
    const summary = summarizeQuestionnaireFields(definition, responses);
    expect(summary.find((field) => field.id === ids.why)?.audience?.shownCount).toBe(2);
    expect(summary.find((field) => field.id === ids.happy)?.audience).toBeUndefined();

    const analysis = toPublicQuestionnaireAnalysis({
      id: uuid(300),
      title: "Demo",
      descriptionRich: null,
      closedAt: new Date("2026-02-01T00:00:00.000Z"),
      definition: rawDefinition,
      responses,
    });
    expect(analysis?.fields.every((field) => !("audience" in field))).toBe(true);
  });
});

describe("filtering responses by a rule", () => {
  it("keeps the responses that satisfy the rule", () => {
    const happy = { fieldId: ids.happy, operator: "equals" as const, value: true };
    expect(filterResponsesByRule(definition, responses, undefined)).toBe(responses);
    expect(filterResponsesByRule(definition, responses, happy)).toHaveLength(2);
    expect(
      filterResponsesByRule(definition, responses, {
        match: "all",
        conditions: [happy, { fieldId: ids.score, operator: "greaterThan", value: 3 }],
      }).map((response) => response.id),
    ).toEqual([uuid(200)]);
  });

  it("rejects a rule that is not valid for the definition", () => {
    expect(() =>
      filterResponsesByRule(definition, responses, {
        fieldId: ids.score,
        operator: "equals",
        value: 9,
      }),
    ).toThrow(ApiError);
  });
});

describe("csv of conditional fields", () => {
  it("tells a question that was not shown from one left empty", () => {
    const lines = createQuestionnaireResponsesCsv(
      responses.map((response) => ({
        id: response.id,
        schemaVersion: 1,
        definitionSnapshot: rawDefinition,
        answers: response.answers,
        submittedAt: response.submittedAt,
      })),
    ).split("\r\n");

    expect(lines[2]?.endsWith('"true","","3","(non mostrata)",""')).toBe(true);
    expect(
      lines[3]?.endsWith('"false","(non mostrata)","1","(non mostrata)","(non mostrata)"'),
    ).toBe(true);
  });
});
