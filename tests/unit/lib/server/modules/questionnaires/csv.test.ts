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
