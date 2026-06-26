import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PublicLoading from "@/app/(public)/loading";
import { CmsErrorState } from "@/components/cms/common/error-state";
import { CmsLoadingState } from "@/components/cms/common/loading-state";
import { CmsFormField, CmsPageHeader, CmsTextInput } from "@/components/cms/primitives";
import { ListenEmptyState } from "@/components/public/listen/listen-empty-state";
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
});
