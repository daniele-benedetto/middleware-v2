import { describe, expect, it } from "vitest";

import { questionnaireSearchText } from "@/lib/server/modules/search/projection/questionnaire-text";

const copy = {
  introduction: "Inchiesta sul lavoro",
  progressLabel: "Passo",
  backLabel: "Indietro",
  nextLabel: "Avanti",
  submitLabel: "Invia",
  requiredFieldsMessage: "Campi obbligatori",
  resumeMessage: "Riprendi",
  successTitle: "Grazie",
  successMessage: "Inviato",
  alreadySubmittedTitle: "Già inviato",
  alreadySubmittedMessage: "Hai già risposto",
  closedTitle: "Chiuso",
  closedMessage: "Questionario chiuso",
  resultsTitle: "Risultati",
  resultsEmptyMessage: "Nessun risultato",
};

describe("questionnaireSearchText", () => {
  it("indexes editorial copy, questions and options but not technical keys or UI labels", () => {
    const text = questionnaireSearchText({
      version: 1,
      copy,
      steps: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          title: "Condizioni",
          fields: [
            {
              id: "00000000-0000-4000-8000-000000000002",
              type: "singleChoice",
              label: "Che contratto hai?",
              required: true,
              options: [
                { id: "00000000-0000-4000-8000-000000000003", label: "Precario" },
                { id: "00000000-0000-4000-8000-000000000004", label: "Indeterminato" },
              ],
            },
          ],
        },
      ],
    });

    expect(text).toBe("Inchiesta sul lavoro Condizioni Che contratto hai? Precario Indeterminato");
    expect(text).not.toMatch(/singleChoice|required|Avanti|0000/);
  });

  it("returns an empty string for invalid definitions", () => {
    expect(questionnaireSearchText({ foo: "bar" })).toBe("");
    expect(questionnaireSearchText(null)).toBe("");
  });
});
