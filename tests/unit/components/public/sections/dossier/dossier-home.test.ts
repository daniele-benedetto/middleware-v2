import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DossierHome } from "@/components/public/sections/dossier/dossier-home";

import type { PublicCurrentIssueDetail } from "@/lib/public/types/issues";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const openingArticle = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "opening",
  title: "Opening host",
  titleStyled: null,
  excerpt: null,
  imageUrl: null,
  imageAlt: null,
  hasAudio: false,
  readingTimeMinutes: 1,
  publishedAt: "2026-01-01T00:00:00.000Z",
  categorySlug: "editoriale",
  categoryName: "Editoriale",
  authorName: null,
};

const closingArticle = {
  ...openingArticle,
  id: "00000000-0000-4000-8000-000000000002",
  slug: "closing",
  title: "Closing host",
};

describe("DossierHome", () => {
  it("preserves preview placement relative to closing blocks in the regia", () => {
    const issue = {
      id: "00000000-0000-4000-8000-000000000003",
      title: "Issue host",
      titleStyled: null,
      slug: "issue-host",
      description: null,
      homeVariant: "black",
      publishedAt: "2026-01-01T00:00:00.000Z",
      articlesCount: 2,
      articles: [openingArticle, closingArticle],
      courses: [],
      maps: [],
      questionnaireAnalyses: [],
      homeBlocks: [
        {
          id: "opening",
          type: "opening",
          articleIds: [openingArticle.id],
          featuredPlacement: "left",
        },
        {
          id: "preview",
          type: "preview",
          previewIssueId: "00000000-0000-4000-8000-000000000004",
        },
        {
          id: "closing",
          type: "closing",
          articleIds: [closingArticle.id],
          featuredPlacement: "left",
        },
      ],
      previewIssues: [
        {
          id: "00000000-0000-4000-8000-000000000004",
          title: "Issue target",
          titleStyled: null,
          slug: "issue-target",
          homeVariant: "black",
          article: {
            ...openingArticle,
            id: "00000000-0000-4000-8000-000000000005",
            slug: "preview-article",
            title: "Preview article",
          },
        },
      ],
    } satisfies PublicCurrentIssueDetail;

    const html = renderToStaticMarkup(
      createElement(DossierHome, {
        issue,
        publishedIssues: [
          {
            id: "00000000-0000-4000-8000-000000000004",
            title: "Issue target",
            titleStyled: null,
            slug: "issue-target",
            description: null,
            homeBlocks: null,
            homeVariant: "black",
            publishedAt: "2026-02-01T00:00:00.000Z",
            articlesCount: 1,
          },
        ],
      }),
    );

    expect(html.indexOf("Preview article")).toBeLessThan(html.indexOf("Closing host"));
    expect(html).toContain('href="#issue-article-00000000-0000-4000-8000-000000000001"');
    expect(html).toContain('id="issue-article-00000000-0000-4000-8000-000000000001"');
  });
});
