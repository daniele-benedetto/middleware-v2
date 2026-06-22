# Public Home Optimization Sprints

Roadmap operativa per rendere la home pubblica piu componibile, stabile e performante. Ogni sprint deve chiudersi con `pnpm typecheck`, `pnpm lint` e, quando tocca logica, `pnpm test:run`.

## Sprint 1 - Component Structure

Obiettivo: separare responsabilita e creare una struttura riusabile senza cambiare intenzionalmente la resa visiva.

- Definire la gerarchia componenti pubblici: `primitives`, `compounds`, `sections`, `pages`.
- Spostare la composizione pagina home da `components/public/home` verso un livello `pages` o equivalente.
- Spezzare `dossier-home.tsx` in componenti piccoli e focalizzati.
- Estrarre componenti condivisi per card articolo, meta articolo, numero articolo, titolo blocco e frame immagine.
- Estrarre la logica di ordinamento/numbering in un view model dedicato e testabile.
- Aggiornare export barrel mantenendo import chiari.
- Verificare che la home mantenga markup e resa visiva equivalenti.

Done quando:

- Nessun file home supera dimensioni difficili da mantenere senza una responsabilita chiara.
- I blocchi home possono essere ricomposti in future pagine senza copiare codice.
- `pnpm typecheck` e `pnpm lint` passano.

## Sprint 2 - Design Tokens And Typography

Obiettivo: uniformare tipografia, colori, spacing e varianti visuali usando primitive riusabili.

- Mappare classi hardcoded ricorrenti: `text-[...]`, `tracking-[...]`, `leading-[...]`, colori inline e border inline.
- Creare primitive pubbliche per `DisplayTitle`, `SectionTitle`, `EditorialText`, `Kicker`, `MetaText` e `SectionHeader` se utili.
- Centralizzare le varianti visuali dei blocchi dossier in un modulo unico.
- Sostituire colori inline ripetuti con token gia presenti in `app/globals.css`.
- Aggiungere nuovi token solo se ricorrenti e davvero semantici.
- Allineare header, footer, archive card e dossier card allo stesso linguaggio tipografico.
- Controllare mobile e desktop dopo ogni sostituzione.

Done quando:

- Le classi arbitrarie restano solo dove esprimono una scelta layout-specifica non generalizzabile.
- Le prossime pagine possono usare primitive tipografiche senza ridefinire scale e colori.
- `pnpm typecheck` e `pnpm lint` passano.

## Sprint 3 - Home Data And Cache

Obiettivo: ottimizzare richieste e rendering considerando che la home cambia raramente.

- Verificare le API cache/rendering disponibili nella versione Next installata prima di modificare `dynamic` o `revalidate`.
- Rimuovere `force-dynamic` dalla home se non necessario.
- Introdurre una strategia di revalidation per contenuto editoriale pubblico.
- Creare un loader server dedicato tipo `getPublicHomeData()` per aggregare current issue, archivio, descrizione plain text e lead image.
- Evitare normalizzazioni duplicate tra `generateMetadata()` e rendering pagina quando possibile.
- Valutare se la lista archivio deve caricare sempre 100 uscite o un limite piu basso iniziale.
- Documentare come invalidare/aggiornare la cache quando si pubblica dal CMS.

Done quando:

- La home non richiede rendering dinamico per ogni visita se non serve.
- Metadata e pagina usano una fonte dati coerente.
- Il comportamento editoriale dopo pubblicazione e chiaro.
- `pnpm build` passa.

## Sprint 4 - Payload And Server Queries

Obiettivo: ridurre il peso dei dati caricati dalla home.

- Analizzare il payload di `getCurrentIssueDetail()` per numero e dimensione articoli.
- Valutare query pubblica specifica per home invece di riusare sempre il detail completo.
- Evitare di caricare `contentRich` completo nella home se serve solo per reading time e preview.
- Valutare salvataggio/calcolo in scrittura di `readingTimeMinutes` e `contentPreview`.
- Mantenere compatibilita con contenuti esistenti se si introducono campi derivati.
- Aggiungere test unitari per mapping DTO e fallback.

Done quando:

- La home riceve solo i campi necessari al rendering.
- Reading time e preview non impongono costi eccessivi a ogni render.
- `pnpm test:run`, `pnpm typecheck` e `pnpm lint` passano.

## Sprint 5 - SEO And Structured Data

Obiettivo: consolidare SEO della home e preparare pattern riusabili per pagine future.

- Estrarre JSON-LD home in helper o componente server dedicato.
- Migliorare schema `CollectionPage` e valutare `ItemList` per gli articoli del numero corrente.
- Preparare helper JSON-LD riusabili per issue, article e breadcrumb.
- Verificare canonical, OG image e Twitter image per home e future pagine pubbliche.
- Migliorare `alt` immagini quando sono disponibili dati editoriali utili.
- Controllare `robots.ts`, `sitemap.ts` e metadata per coerenza con contenuti pubblici.

Done quando:

- La home ha structured data chiaro e isolato dal componente visuale.
- I pattern SEO sono riusabili per `/uscite/[slug]`, `/articoli/[slug]`, categorie e tag.
- `pnpm build` passa.

## Sprint 6 - Frontend Performance And Accessibility

Obiettivo: migliorare esperienza utente senza appesantire bundle e interattivita.

- Verificare che la home resti principalmente server component.
- Isolare componenti client-only come scroll progress e menu.
- Controllare uso di `priority` su immagini above-the-fold.
- Uniformare `sizes` delle immagini estratte.
- Verificare heading order, label link, focus states e navigazione tastiera.
- Valutare focus trap completo per il menu fullscreen.
- Controllare resa responsive su mobile, tablet e desktop.

Done quando:

- Nessun componente server diventa client senza necessita.
- Immagini e interazioni sono ottimizzate per LCP e accessibilita.
- `pnpm build` passa.

## Sprint 7 - Documentation And Governance

Obiettivo: rendere sostenibile la creazione delle prossime pagine.

Stato: completato il 2026-06-22.

- Aggiornare `docs/architecture.md` con la struttura pubblica finale se cambia in modo significativo.
- Documentare regole di composizione componenti pubblici.
- Definire quando creare una primitive, un compound o una section.
- Aggiungere esempi minimi di composizione per nuove pagine pubbliche.
- Eliminare componenti o helper rimasti inutilizzati dopo il refactor.

Done quando:

- Un nuovo sviluppatore puo creare una pagina pubblica senza copiare blocchi dalla home.
- La documentazione attiva resta snella e aggiornata.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:run`, `pnpm build` e `pnpm format:check` passano prima della chiusura complessiva.

TODO DA FARE POI:

- Apertura numero invece di badge ui piu moderna e coerente
- Citazione del menù con ui piu moderna e coerente
- Animazioni avanzate
- Cambiare palette colori:
  - #F7F0E7 => Crema
  - #C13814 => Rosso
  - #000000 => Nero
  - #FFFFFF => Bianco
