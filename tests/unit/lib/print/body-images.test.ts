import { describe, expect, it } from "vitest";

import { stripPrintBodyImages } from "@/lib/print/body-images";

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const image = (src: string) => ({ type: "image", attrs: { src } });

describe("print body images", () => {
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
