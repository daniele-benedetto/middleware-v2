import { createQuestionnaireResponsesCsv } from "@/lib/server/modules/questionnaires/csv";

const fieldId = "00000000-0000-4000-8000-000000000002";
const optionId = "00000000-0000-4000-8000-000000000003";

describe("createQuestionnaireResponsesCsv", () => {
  it("uses snapshot labels and safely escapes cells", () => {
    const content = createQuestionnaireResponsesCsv([
      {
        id: "00000000-0000-4000-8000-000000000001",
        schemaVersion: 1,
        submittedAt: new Date("2026-09-07T10:00:00.000Z"),
        definitionSnapshot: {
          version: 1,
          copy: {
            progressLabel: "Progress",
            backLabel: "Back",
            nextLabel: "Next",
            submitLabel: "Send",
            requiredFieldsMessage: "Required",
            resumeMessage: "Resume",
            successTitle: "Done",
            successMessage: "Done",
            alreadySubmittedTitle: "Already",
            alreadySubmittedMessage: "Already",
            closedTitle: "Closed",
            closedMessage: "Closed",
            resultsTitle: "Results",
            resultsEmptyMessage: "Empty",
          },
          steps: [
            {
              id: "00000000-0000-4000-8000-000000000004",
              title: "Profilo",
              fields: [
                {
                  id: fieldId,
                  type: "singleChoice",
                  label: "Scelta",
                  required: false,
                  publicResults: false,
                  options: [{ id: optionId, label: "Si, grazie" }],
                },
              ],
            },
          ],
        },
        answers: { [fieldId]: optionId },
      },
      {
        id: "00000000-0000-4000-8000-000000000005",
        schemaVersion: 1,
        submittedAt: new Date("2026-09-07T10:01:00.000Z"),
        definitionSnapshot: {
          version: 1,
          copy: {
            progressLabel: "Progress",
            backLabel: "Back",
            nextLabel: "Next",
            submitLabel: "Send",
            requiredFieldsMessage: "Required",
            resumeMessage: "Resume",
            successTitle: "Done",
            successMessage: "Done",
            alreadySubmittedTitle: "Already",
            alreadySubmittedMessage: "Already",
            closedTitle: "Closed",
            closedMessage: "Closed",
            resultsTitle: "Results",
            resultsEmptyMessage: "Empty",
          },
          steps: [
            {
              id: "00000000-0000-4000-8000-000000000004",
              title: "Profilo",
              fields: [
                {
                  id: fieldId,
                  type: "text",
                  label: "Scelta",
                  required: false,
                  publicResults: false,
                },
              ],
            },
          ],
        },
        answers: { [fieldId]: '=SUM(1,1)\n"test"' },
      },
    ]);

    expect(content).toContain('"Profilo · Scelta"');
    expect(content).toContain('"Si, grazie"');
    expect(content).toContain('"\'=SUM(1,1)\n""test"""');
  });
});

describe("createQuestionnaireResponsesCsv: Altro and conditional fields", () => {
  const multipleId = "00000000-0000-4000-8000-000000000011";
  const detailId = "00000000-0000-4000-8000-000000000012";
  const snapshot = {
    version: 1,
    copy: {
      progressLabel: "Progress",
      backLabel: "Back",
      nextLabel: "Next",
      submitLabel: "Send",
      requiredFieldsMessage: "Required",
      resumeMessage: "Resume",
      successTitle: "Done",
      successMessage: "Done",
      alreadySubmittedTitle: "Already",
      alreadySubmittedMessage: "Already",
      closedTitle: "Closed",
      closedMessage: "Closed",
      resultsTitle: "Results",
      resultsEmptyMessage: "Empty",
    },
    steps: [
      {
        id: "00000000-0000-4000-8000-000000000004",
        title: "Profilo",
        fields: [
          {
            id: fieldId,
            type: "singleChoice",
            label: "Scelta",
            allowOther: true,
            options: [{ id: optionId, label: "Uno" }],
          },
          {
            id: multipleId,
            type: "multipleChoice",
            label: "Multipla",
            allowOther: true,
            otherLabel: "Altro tema",
            options: [{ id: optionId.replace(/3$/, "9"), label: "Due" }],
          },
          {
            id: detailId,
            type: "text",
            label: "Dettaglio",
            required: true,
            visibleWhen: { fieldId, operator: "equals", value: optionId },
          },
        ],
      },
    ],
  };
  const row = (id: string, answers: Record<string, unknown>) => ({
    id,
    schemaVersion: 1,
    submittedAt: new Date("2026-09-07T10:00:00.000Z"),
    definitionSnapshot: snapshot,
    answers,
  });

  it("writes the Altro label with its free text", () => {
    const lines = createQuestionnaireResponsesCsv([
      row("00000000-0000-4000-8000-000000000021", {
        [fieldId]: { other: '=Tre "quattro"' },
        [multipleId]: [optionId.replace(/3$/, "9"), { other: "Cucina" }],
      }),
    ]).split("\r\n");

    expect(lines[1]).toContain('"Altro: =Tre ""quattro"""');
    expect(lines[1]).toContain('"Due | Altro tema: Cucina"');
    expect(lines[1]).not.toContain("[object Object]");
  });

  it("leaves the cell of a hidden field empty and keeps old answers unchanged", () => {
    const lines = createQuestionnaireResponsesCsv([
      row("00000000-0000-4000-8000-000000000021", { [fieldId]: { other: "Tre" } }),
      row("00000000-0000-4000-8000-000000000022", { [fieldId]: optionId, [detailId]: "Visibile" }),
    ]).split("\r\n");

    expect(lines[1]?.endsWith('"Altro: Tre","",""')).toBe(true);
    expect(lines[2]?.endsWith('"Uno","","Visibile"')).toBe(true);
  });
});
