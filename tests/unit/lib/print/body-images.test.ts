import { describe, expect, it } from "vitest";

import { placePrintBodyImages, stripPrintBodyImages } from "@/lib/print/body-images";

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const image = (src: string) => ({ type: "image", attrs: { src } });

function sides(value: unknown) {
  return (value as { content: Array<{ type: string; attrs?: { printSide?: string } }> }).content
    .filter((node) => node.type === "image")
    .map((node) => node.attrs?.printSide ?? null);
}

describe("print body images", () => {
  it("alternates the images between the blocks of the text", () => {
    const doc = {
      type: "doc",
      content: [
        paragraph("a"),
        image("1"),
        paragraph("b"),
        image("2"),
        paragraph("c"),
        image("3"),
        paragraph("d"),
      ],
    };

    expect(sides(placePrintBodyImages(doc))).toEqual(["start", "end", "start"]);
  });

  it("keeps an image before the text away from the drop cap", () => {
    const doc = { type: "doc", content: [image("1"), paragraph("a"), image("2"), paragraph("b")] };

    expect(sides(placePrintBodyImages(doc))).toEqual(["end", "start"]);
  });

  it("places images after all the text and nested ones too", () => {
    const doc = {
      type: "doc",
      content: [
        paragraph("a"),
        { type: "blockquote", content: [image("1"), paragraph("b")] },
        image("2"),
      ],
    };
    const placed = placePrintBodyImages(doc) as {
      content: [unknown, { content: [{ attrs: { printSide: string } }] }, unknown];
    };

    expect(placed.content[1].content[0].attrs.printSide).toBe("start");
    expect(sides(placed)).toEqual(["end"]);
  });

  it("keeps the image attributes", () => {
    const doc = { type: "doc", content: [paragraph("a"), image("1"), paragraph("b")] };

    expect((placePrintBodyImages(doc) as { content: unknown[] }).content[1]).toEqual({
      type: "image",
      attrs: { src: "1", printSide: "start" },
    });
  });

  it("strips images at any depth", () => {
    const doc = {
      type: "doc",
      content: [paragraph("a"), image("1"), { type: "blockquote", content: [image("2")] }],
    };

    expect(stripPrintBodyImages(doc)).toEqual({
      type: "doc",
      content: [paragraph("a"), { type: "blockquote", content: [] }],
    });
  });
});
