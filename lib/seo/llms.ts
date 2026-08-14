import { seoConfig } from "@/lib/seo/config";
import { getCanonicalUrl } from "@/lib/seo/metadata";

export function buildLlmsTxt(): string {
  return `# ${seoConfig.siteName}

> ${seoConfig.defaultDescription}

## Pagine principali

- [Homepage](${getCanonicalUrl("/")}): il numero corrente e l'archivio editoriale.
- [Articoli](${getCanonicalUrl("/articoli")}): tutti gli articoli pubblicati.
- [Archivio](${getCanonicalUrl("/uscite")}): i numeri pubblicati del magazine.
- [Contro-formazione](${getCanonicalUrl("/contro-formazione")}): percorsi e incontri di formazione collettiva.
- [Chi siamo](${getCanonicalUrl("/chi-siamo")}): identita e progetto editoriale.

## Contenuti

- Gli articoli sono disponibili in pagine canoniche sotto /articoli/:slug.
- Le uscite del magazine sono disponibili sotto /uscite/:slug.
- I percorsi di contro-formazione sono disponibili sotto /contro-formazione/:courseSlug.
- Gli incontri sono disponibili sotto /contro-formazione/:courseSlug/:lessonSlug.

## Feed

- [RSS](${getCanonicalUrl("/feed.xml")})
`;
}
