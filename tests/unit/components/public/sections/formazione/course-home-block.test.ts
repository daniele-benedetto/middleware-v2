import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CourseHomeBlock } from "@/components/public/sections/formazione/course-home-block";

describe("CourseHomeBlock", () => {
  it("renders the selected course and its ordered lessons", () => {
    const html = renderToStaticMarkup(
      createElement(CourseHomeBlock, {
        block: {
          id: "course",
          type: "course",
          course: {
            id: "00000000-0000-4000-8000-000000000001",
            title: "Contro-formazione",
            titleStyled: null,
            slug: "contro-formazione",
            description: {
              type: "doc",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Descrizione" }] }],
            },
            homeVariant: "red",
            publishedAt: "2026-01-01T00:00:00.000Z",
            lessonsCount: 1,
            lessons: [
              {
                id: "00000000-0000-4000-8000-000000000002",
                slug: "lezione",
                title: "Lezione",
                titleStyled: null,
                excerpt: null,
                imageUrl: null,
                imageAlt: null,
                hasAudio: false,
                sortOrder: 0,
                readingTimeMinutes: 1,
                publishedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          },
        },
        startNumber: 7,
      }),
    );

    expect(html).toContain("bg-accent text-background");
    expect(html).toContain("Descrizione");
    expect(html).toContain("/contro-formazione/contro-formazione");
    expect(html).toContain("/contro-formazione/contro-formazione/lezione");
    expect(html).toContain(">07<");
  });
});
