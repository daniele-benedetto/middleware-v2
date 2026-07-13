import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PublicRichText } from "@/components/public/rich-text";
import {
  PUBLIC_RICH_TEXT_MARK_TYPES,
  PUBLIC_RICH_TEXT_NODE_TYPES,
  resolveSafeRichTextLinkHref,
} from "@/lib/rich-text/public-schema";

describe("PublicRichText", () => {
  it("documents the public rich text whitelist", () => {
    expect(PUBLIC_RICH_TEXT_NODE_TYPES).toEqual([
      "paragraph",
      "heading",
      "bulletList",
      "orderedList",
      "listItem",
      "blockquote",
      "codeBlock",
      "image",
      "noteReference",
      "hardBreak",
      "text",
    ]);
    expect(PUBLIC_RICH_TEXT_MARK_TYPES).toEqual(["bold", "italic", "strike", "code", "link"]);
  });

  it("renders supported block nodes", () => {
    const html = renderToStaticMarkup(
      createElement(PublicRichText, {
        value: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Paragraph" }] },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Heading 2" }],
            },
            {
              type: "heading",
              attrs: { level: 3 },
              content: [{ type: "text", text: "Heading 3" }],
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Bullet" }] }],
                },
              ],
            },
            {
              type: "orderedList",
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Ordered" }] }],
                },
              ],
            },
            {
              type: "blockquote",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Quote" }] }],
            },
            { type: "codeBlock", content: [{ type: "text", text: "const value = 1;" }] },
            {
              type: "image",
              attrs: {
                src: "/api/public/media/blob?pathname=pages%2Fimage.jpg",
                alt: "Alt text",
                title: "Title text",
              },
            },
          ],
        },
      }),
    );

    expect(html).toContain("<p>Paragraph</p>");
    expect(html).toContain("<h2");
    expect(html).toContain("Heading 2");
    expect(html).toContain("<h3");
    expect(html).toContain("Heading 3");
    expect(html).toContain("<ul");
    expect(html).toContain("Bullet");
    expect(html).toContain("<ol");
    expect(html).toContain("Ordered");
    expect(html).toContain("<blockquote");
    expect(html).toContain("Quote");
    expect(html).toContain("<pre");
    expect(html).toContain("const value = 1;");
    expect(html).toContain('alt="Alt text"');
    expect(html).toContain('width="1200"');
    expect(html).toContain('height="675"');
  });

  it("renders supported marks and safe links", () => {
    const html = renderToStaticMarkup(
      createElement(PublicRichText, {
        value: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Bold", marks: [{ type: "bold" }] },
                { type: "text", text: "Italic", marks: [{ type: "italic" }] },
                { type: "text", text: "Strike", marks: [{ type: "strike" }] },
                { type: "text", text: "Code", marks: [{ type: "code" }] },
                {
                  type: "text",
                  text: "Internal",
                  marks: [{ type: "link", attrs: { href: "/chi-siamo" } }],
                },
                {
                  type: "text",
                  text: "External",
                  marks: [{ type: "link", attrs: { href: "https://example.com/path" } }],
                },
                {
                  type: "text",
                  text: "Unsafe",
                  marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
                },
              ],
            },
          ],
        },
      }),
    );

    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<em>Italic</em>");
    expect(html).toContain("<s>Strike</s>");
    expect(html).toContain("<code>Code</code>");
    expect(html).toContain('<a href="/chi-siamo">Internal</a>');
    expect(html).toContain(
      '<a href="https://example.com/path" target="_blank" rel="noopener noreferrer">External</a>',
    );
    expect(html).toContain("Unsafe");
    expect(html).not.toContain("javascript:alert");
  });

  it("allows only safe rich text link hrefs", () => {
    expect(resolveSafeRichTextLinkHref("/locale")).toBe("/locale");
    expect(resolveSafeRichTextLinkHref("#sezione")).toBe("#sezione");
    expect(resolveSafeRichTextLinkHref("https://example.com")).toBe("https://example.com/");
    expect(resolveSafeRichTextLinkHref("mailto:test@example.com")).toBe("mailto:test@example.com");
    expect(resolveSafeRichTextLinkHref("tel:+390000000000")).toBe("tel:+390000000000");
    expect(resolveSafeRichTextLinkHref("javascript:alert(1)")).toBeNull();
    expect(resolveSafeRichTextLinkHref("relative/path")).toBeNull();
  });

  it("renders article notes with forward and back links", () => {
    const html = renderToStaticMarkup(
      createElement(PublicRichText, {
        value: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "First" },
                {
                  type: "noteReference",
                  attrs: {
                    id: "note-a",
                    contentRich: {
                      type: "doc",
                      content: [
                        {
                          type: "paragraph",
                          content: [
                            { type: "text", text: "Nota " },
                            { type: "text", text: "importante", marks: [{ type: "bold" }] },
                            {
                              type: "text",
                              text: " link",
                              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                { type: "text", text: " second" },
                {
                  type: "noteReference",
                  attrs: {
                    id: "note-b",
                    contentRich: {
                      type: "doc",
                      content: [
                        { type: "paragraph", content: [{ type: "text", text: "Seconda nota" }] },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
      }),
    );

    expect(html).toContain("Note");
    expect(html).toContain('id="note-ref-1"');
    expect(html).toContain('href="#note-1"');
    expect(html).toContain('id="note-1"');
    expect(html).toContain('href="#note-ref-1"');
    expect(html).toMatch(/<a[^>]*href="#note-ref-1"[^>]*>1\.<\/a><div/);
    expect(html).toContain("[1]");
    expect(html).toContain("[2]");
    expect(html).toContain("<strong>importante</strong>");
    expect(html).toContain('href="https://example.com/"');
  });
});
