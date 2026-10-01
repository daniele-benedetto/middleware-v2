import { describe, expect, it } from "vitest";

import { toPrintNotes } from "@/lib/print/notes";

const text = (value: string) => ({ type: "text", text: value });
const paragraph = (...content: object[]) => ({ type: "paragraph", content });
const doc = (...content: object[]) => ({ type: "doc", content });
const note = (...content: object[]) => ({ type: "printNote", content });

describe("toPrintNotes", () => {
  it("moves CMS note references to their call", () => {
    const value = doc(
      paragraph(
        text("Testo"),
        {
          type: "noteReference",
          attrs: { id: "n1", contentRich: doc(paragraph(text("Fonte")), paragraph(text("bis"))) },
        },
        text(" e altro."),
      ),
    );

    expect(toPrintNotes(value)).toEqual(
      doc(paragraph(text("Testo"), note(text("Fonte"), text(" "), text("bis")), text(" e altro."))),
    );
  });

  it("drops CMS note references without content", () => {
    const value = doc(paragraph(text("Testo"), { type: "noteReference", attrs: {} }));

    expect(toPrintNotes(value)).toEqual(doc(paragraph(text("Testo"))));
  });

  it("moves hand-typed notes from the end of the text to their superscript call", () => {
    const value = doc(
      paragraph(text("Prima frase.¹ Seconda frase.²")),
      paragraph(text("¹ Cfr. Kamo Modena.")),
      paragraph(text("² "), { type: "text", text: "Machina", marks: [{ type: "italic" }] }),
    );

    expect(toPrintNotes(value)).toEqual(
      doc(
        paragraph(
          text("Prima frase."),
          note(text("Cfr. Kamo Modena.")),
          text(" Seconda frase."),
          note({ type: "text", text: "Machina", marks: [{ type: "italic" }] }),
        ),
      ),
    );
  });

  it("keeps hand-typed notes that have no call in the text", () => {
    const value = doc(
      paragraph(text("Frase.¹")),
      paragraph(text("¹ Una.")),
      paragraph(text("² Due.")),
    );

    expect(toPrintNotes(value)).toEqual(
      doc(paragraph(text("Frase."), note(text("Una."))), paragraph(text("² Due."))),
    );
  });

  it("leaves superscripts alone when there are no typed notes", () => {
    const value = doc(paragraph(text("10 m² di verde")));

    expect(toPrintNotes(value)).toEqual(value);
  });
});
