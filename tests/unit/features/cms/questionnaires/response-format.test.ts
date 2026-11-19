import { describe, expect, it } from "vitest";

import {
  formatResponseAnswer,
  selectResponseKeyFields,
  type QuestionnaireField,
} from "@/features/cms/questionnaires/utils/response-format";

const labels = {
  answerMissing: "missing",
  answerYes: "yes",
  answerNo: "no",
  invalidValue: "invalid",
};

const field = (value: Record<string, unknown>) => value as unknown as QuestionnaireField;
const choice = field({
  id: "choice",
  type: "multipleChoice",
  options: [
    { id: "a", label: "Alfa" },
    { id: "b", label: "Beta" },
  ],
});

describe("formatResponseAnswer", () => {
  it("formats empty, boolean, choice and scalar answers", () => {
    expect(formatResponseAnswer(undefined, choice, labels)).toBe("missing");
    expect(formatResponseAnswer(true, field({ type: "boolean" }), labels)).toBe("yes");
    expect(formatResponseAnswer(false, field({ type: "consent" }), labels)).toBe("no");
    expect(formatResponseAnswer(["a", "x"], choice, labels)).toBe("Alfa, invalid");
    expect(formatResponseAnswer(7, field({ type: "scale" }), labels)).toBe("7");
    expect(formatResponseAnswer({}, field({ type: "text" }), labels)).toBe("invalid");
  });
});

describe('formatResponseAnswer with the "Altro" choice', () => {
  const single = field({
    id: "single",
    type: "singleChoice",
    allowOther: true,
    otherLabel: "Altro mezzo",
    options: [{ id: "a", label: "Alfa" }],
  });

  it("renders the free text after the label of the choice", () => {
    expect(formatResponseAnswer({ other: "Monopattino" }, single, labels)).toBe(
      "Altro mezzo: Monopattino",
    );
    expect(formatResponseAnswer("a", single, labels)).toBe("Alfa");
  });

  it("renders it inside a multiple choice list, with the default label", () => {
    expect(formatResponseAnswer(["b", { other: "Gamma" }], choice, labels)).toBe(
      "Beta, Altro: Gamma",
    );
  });

  it("keeps reporting malformed values as invalid", () => {
    expect(formatResponseAnswer({ other: 3 }, single, labels)).toBe("invalid");
    expect(formatResponseAnswer([{ altro: "x" }], choice, labels)).toBe("invalid");
  });
});

describe("selectResponseKeyFields", () => {
  it("keeps the first closed-answer fields in definition order", () => {
    const definition = {
      steps: [
        { fields: [{ id: "1", type: "information" }, { id: "2", type: "text" }, choice] },
        {
          fields: [
            { id: "4", type: "consent" },
            { id: "5", type: "scale" },
            { id: "6", type: "boolean" },
            { id: "7", type: "date" },
          ],
        },
      ],
    } as unknown as Parameters<typeof selectResponseKeyFields>[0];

    expect(selectResponseKeyFields(definition).map((item) => item.id)).toEqual([
      "choice",
      "5",
      "6",
    ]);
  });
});
