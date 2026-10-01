import { describe, expect, it } from "vitest";

import { isInterviewQuestion } from "@/lib/print/interview";

const bold = [{ type: "bold" }];
const italic = [{ type: "italic" }];

describe("isInterviewQuestion", () => {
  it("recognises a bold speaker initial followed by italic text", () => {
    expect(
      isInterviewQuestion({
        content: [
          { text: "F:", marks: bold },
          { text: " " },
          { text: "Hai detto che l’hai scelto. Come mai?", marks: italic },
        ],
      }),
    ).toBe(true);
  });

  it("treats roman text after the initial as an answer", () => {
    expect(
      isInterviewQuestion({
        content: [{ text: "S:", marks: bold }, { text: " Io sono Sara, ho 23 anni." }],
      }),
    ).toBe(false);
  });

  it("ignores plain paragraphs", () => {
    expect(isInterviewQuestion({ content: [{ text: "Buona lettura." }] })).toBe(false);
  });
});
