import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PrintRichText } from "@/components/cms/print/print-rich-text";
import { splitPrintDropCap } from "@/lib/print/drop-cap";

function lead(text: string) {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

describe("printed drop cap", () => {
  it.each(["L’evento", "L'evento", "“L’evento", "’Ndrangheta", "«Ascoltiamo"])(
    "keeps the opening punctuation with the initial in %s",
    (text) => {
      const html = renderToStaticMarkup(
        createElement(PrintRichText, { value: lead(text), dropCap: true }),
      );

      const parts = splitPrintDropCap(text)!;
      expect(html).toContain(
        `class="print-drop-cap">${parts.initial.replaceAll("'", "&#x27;")}</span>`,
      );
      expect(html).toContain(`${parts.rest}</p>`);
    },
  );

  it("leaves a normal initial to the existing CSS drop cap", () => {
    const html = renderToStaticMarkup(
      createElement(PrintRichText, { value: lead("Parlare di sicurezza"), dropCap: true }),
    );
    expect(html).not.toContain("print-drop-cap");
  });
});
