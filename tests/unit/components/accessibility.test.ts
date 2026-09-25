import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PublicLoading from "@/app/(public)/loading";
import { CmsErrorState } from "@/components/cms/common/error-state";
import { CmsLoadingState } from "@/components/cms/common/loading-state";
import { CmsFormField, CmsPageHeader, CmsTextInput } from "@/components/cms/primitives";
import { ListenEmptyState } from "@/components/public/listen/listen-empty-state";
import { QuestionnaireFieldChart } from "@/components/public/sections/questionnaires/charts/questionnaire-field-chart";
import { editorialImageAlt } from "@/lib/public/format/image";

describe("accessibility primitives", () => {
  const TestCmsFormField = CmsFormField as ComponentType<Record<string, unknown>>;

  it("renders CMS page headers as the document heading", () => {
    const html = renderToStaticMarkup(createElement(CmsPageHeader, { title: "Articoli" }));

    expect(html).toContain("<h1");
    expect(html).toContain("Articoli");
  });

  it("connects CMS field errors and hints to single field controls", () => {
    const errorHtml = renderToStaticMarkup(
      createElement(
        TestCmsFormField,
        { label: "Titolo", htmlFor: "article-title", error: "Campo obbligatorio" },
        createElement(CmsTextInput, { id: "article-title" }),
      ),
    );
    const hintHtml = renderToStaticMarkup(
      createElement(
        TestCmsFormField,
        { label: "Slug", htmlFor: "article-slug", hint: "Generato dal titolo" },
        createElement(CmsTextInput, { id: "article-slug" }),
      ),
    );

    expect(errorHtml).toContain('aria-describedby="article-title-error"');
    expect(errorHtml).toContain('aria-invalid="true"');
    expect(errorHtml).toContain('id="article-title-error"');
    expect(hintHtml).toContain('aria-describedby="article-slug-hint"');
    expect(hintHtml).toContain('id="article-slug-hint"');
  });

  it("announces loading and error states to assistive technology", () => {
    const loadingHtml = renderToStaticMarkup(createElement(CmsLoadingState));
    const publicLoadingHtml = renderToStaticMarkup(createElement(PublicLoading));
    const errorHtml = renderToStaticMarkup(
      createElement(CmsErrorState, { title: "Errore", description: "Riprova" }),
    );
    const emptyListenHtml = renderToStaticMarkup(createElement(ListenEmptyState));

    expect(loadingHtml).toContain('role="status"');
    expect(loadingHtml).toContain('aria-busy="true"');
    expect(publicLoadingHtml).toContain('role="status"');
    expect(publicLoadingHtml).toContain("Caricamento contenuti in corso.");
    expect(errorHtml).toContain('role="alert"');
    expect(emptyListenHtml).toContain('role="status"');
  });

  it("keeps editorial images decorative when editorial alt is absent", () => {
    expect(editorialImageAlt(null)).toBe("");
    expect(editorialImageAlt(undefined)).toBe("");
    expect(editorialImageAlt("Descrizione editoriale")).toBe("Descrizione editoriale");
  });

  it("renders questionnaire aggregates as percentages without response totals or counts", () => {
    const html = renderToStaticMarkup(
      createElement(QuestionnaireFieldChart, {
        field: {
          id: "00000000-0000-4000-8000-000000000001",
          label: "Scelta",
          description: null,
          fieldType: "singleChoice",
          kind: "choice",
          multiple: false,
          responseCount: 10,
          missingCount: 0,
          options: [
            {
              id: "00000000-0000-4000-8000-000000000002",
              label: "Prima opzione",
              count: 7,
              percentage: 70,
              rank: 1,
            },
            {
              id: "00000000-0000-4000-8000-000000000003",
              label: "Seconda opzione",
              count: 3,
              percentage: 30,
              rank: 2,
            },
          ],
        },
      }),
    );

    expect(html).toContain("Prima opzione");
    expect(html).toContain("70%");
    expect(html).toContain("30%");
    expect(html).not.toContain("questionari inviati");
    expect(html).not.toContain("risposte valide");
    expect(html).not.toContain("· 7");
  });
});
