import { describe, expect, it } from "vitest";

import { assertPrintEditionTransition } from "@/lib/print/workflow";

describe("print edition workflow", () => {
  it("allows a draft to enter review", () => {
    expect(() => assertPrintEditionTransition("DRAFT", "IN_REVIEW")).not.toThrow();
  });

  it("does not allow an exported edition to return to draft", () => {
    expect(() => assertPrintEditionTransition("EXPORTED", "DRAFT")).toThrow(
      /Transizione non valida/,
    );
  });
});
