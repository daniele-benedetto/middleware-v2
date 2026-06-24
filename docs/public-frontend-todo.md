Certo — ecco la versione in italiano del documento che hai caricato:

```md
# Frontend pubblico — Audit & TODO

Audit di `app/(public)/**` + `components/public/**` e dei livelli SEO/dati che li alimentano, confrontati con le best practice di Next.js 16.2 / React 19. Verificato sui documenti locali in `node_modules/next/dist/docs`.

**Stato generale: buono.** Il sito pubblico è davvero server-first: ci sono solo 5 componenti client in `components/public`, tutti giustificati. Usa `next/image` ovunque, senza `<img>` raw, ha una base SEO completa (`sitemap.ts`, `robots.ts`, `manifest.ts`, `next/font`, `generateMetadata` per route, JSON-LD) e usa ISR (`revalidate = 3600` + `generateStaticParams`) con `unstable_cache` per deduplicare il doppio fetch metadata/pagina. Gli elementi sotto sono miglioramenti, non emergenze. Priorità:
`[ALTA]` da fare presto · `[MEDIA]` utile da fare · `[BASSA]` rifinitura/nice-to-have.

Legenda effort: `S` ≤30min · `M` qualche ora · `L` più grande/strutturale.

---

## 0. Quick wins — da fare prima

- [ ] **`[ALTA]`/S** Aggiungere `id="main-content"` al `<main>` in `app/(public)/loading.tsx` — attualmente è solo
      `<main className="...">`. Lo skip link del layout punta a `#main-content`; durante Suspense/loading il target non esiste, quindi lo skip link resta rotto. → vedi A11Y-1.
- [ ] **`[MEDIA]`/S** Eliminare i file morti verificati, con zero importatori — tutti i consumer importano da
      `@/components/public/compounds`:
  - `components/public/sections/dossier/article-meta.tsx` — shim di re-export
  - `components/public/sections/dossier/dossier-article-card.tsx` — shim di re-export
  - `components/public/sections/dossier/index.ts` — barrel senza importatori
  - `components/public/sections/dossier/dossier-view-model.ts:34` — re-export di `getBlockNumberingArticles`, non usato
- [ ] **`[BASSA]`/S** Rimuovere le directory placeholder vuote: `components/public/home-v2/`, `components/public/audio/`,
      `components/public/motion/`, `app/(public)/v2/`. Ricrearle solo quando servono davvero.

---

## 1. Architettura

- [x] **A-1 `[ALTA]`/M — ✅ FATTO. Le pagine pubbliche caricavano inutilmente client tRPC/React Query.**
      `TrpcProvider` + `<Toaster>` rimossi da `app/layout.tsx` (ora il root renderizza solo `{children}`) e
      spostati in `app/(cms)/cms/layout.tsx`, che avvolge le sole pagine CMS interattive. Verificato che
      `(auth)/cms/login` (login form senza trpc/toast) e `(cms-preview)` (toolbar server-only) non ne hanno
      bisogno. Risultato: pagine pubbliche, login e preview renderizzano senza il client tRPC/RQ/superjson/sonner.
- [x] **A-2 `[MEDIA]`/M — ✅ FATTO (da verificare in browser). Scroll restoration su back/forward.**
      `components/public/public-page-transition.tsx` ora intercetta `popstate` con un ref e salta lo
      `scrollTo(0, 0)` forzato sulle navigazioni back/forward, lasciando il ripristino al browser/Next; lo
      scroll-to-top resta sulle navigazioni forward. ⚠️ Resta da confermare con un test manuale del tasto indietro.
- [ ] **A-3 `[BASSA]`/L — `unstable_cache` → `use cache` con Cache Components.**
      I documenti locali indicano che `unstable_cache` “has been replaced by `use cache` in Next.js 16”.
      Tutto `lib/public/server/*` lo usa. È la strada moderna, ma è una migrazione reale: richiede
      `experimental.cacheComponents` e cambiamenti comportamentali nell’app. Backlog, non urgente: il setup attuale è corretto e supportato.
- [x] **A-4 `[BASSA]`/S — ✅ FATTO. `dossier-view-model.ts` documentato come facade intenzionale.**
      Aggiunto un commento che lo descrive come superficie API stabile, dossier-scoped, sopra
      `lib/public/issue-numbering` (mantiene i blocchi disaccoppiati dagli internals della numerazione). Layer mantenuto.
- [ ] **A-5 `[BASSA]`/note — `ViewTransition` è ancora un’API React instabile** (`public-page-transition.tsx`).
      Non danneggia l’LCP iniziale, perché si attiva solo sugli update, e il boundary client non “contamina” i children:
      i children arrivano come RSC da un layout server. Da monitorare nei futuri upgrade Next/React.
- [x] **A-6 `[BASSA]`/S — ✅ FATTO. Tipo fuorviante in `archive-view-model.ts` corretto.**
      Verificato: `PublicIssueListItem` espone `description` (non `descriptionPlain`), quindi l’`Omit` era un
      no-op. Sostituito con `PublicIssueListItem & { descriptionPlain; issueNumber }` + commento sui due campi derivati.

---

## 2. Performance

- [ ] **Perf-1 `[ALTA]`/M** — Stessa correzione di **A-1**: rimuovere i provider tRPC/RQ/superjson/sonner dall’albero pubblico è la più grande riduzione di JS per le pagine pubbliche.
- [ ] **Perf-2 `[MEDIA]`/M — L’audio player fa re-render circa 4×/sec.**
      `components/public/listen/article-listen-player.tsx`: `onTimeUpdate` chiama `setCurrentTime` a ogni tick,
      rieseguendo `getActiveAudioChunk` / `chunks.findLast(...)` / `getVisibleAudioChunks` circa alle righe 120-127 a ogni render.
      Wrappare il calcolo della chunk attiva/visibile in `useMemo`, con dipendenze `[chunks, currentTime]`.
      Inoltre, smettere di chiamare `syncDuration` da `onTimeUpdate` una volta nota la durata.
- [ ] **Perf-3 `[MEDIA]`/L — Separare la shell statica dell’audio player dal client bundle.**
      Il componente `"use client"` da 447 righe renderizza anche `<h1>` statico, excerpt e pannello chunk.
      Solo i controlli e `<audio>` devono stare nel client. Estrarre una shell server e un client `AudioControls` più piccolo.
      Si collega a Refactor-7, cioè estrazione degli hook.
- [ ] **Perf-4 `[BASSA]`/S — Formati immagine.** `next.config.ts` `images` non ha `formats`.
      Aggiungere `formats: ["image/avif", "image/webp"]` per una compressione migliore sulle immagini editoriali.
- [ ] **Perf-5 `[BASSA]`/S — Ridurre i pesi dei font.** `app/layout.tsx` carica Archivo con 6 pesi
      (400–900), Spectral con 3 e IBM Plex Mono con 4. Confermare quali pesi sono davvero usati e rimuovere quelli inutilizzati per ridurre il payload font.
- [ ] **Perf-6 `[BASSA]`/S — Logo SVG tramite `next/image`.** `public-footer-brand.tsx` /
      `public-brand.tsx` renderizzano un logo SVG tramite `next/image`, cioè passano dall’optimizer senza benefici per i vettoriali.
      Inlineare l’SVG oppure passare `unoptimized`.
- [ ] **Perf-7 `[BASSA]`/S — `loading="lazy"` ridondante** sul `next/image` in
      `rich-text/public-rich-text.tsx` circa alla riga 203: è già il default.
- [ ] **Perf-8 `[BASSA]`/S — Listener per reduced motion.** `home/home-scroll-progress.tsx` legge
      `prefers-reduced-motion` una sola volta al mount, ma non si iscrive ai cambiamenti. La rail dell’archive invece lo fa.
      Piccola correzione di coerenza.

---

## 3. SEO

- [ ] **SEO-1 `[MEDIA]`/M — La gerarchia heading salta da `h1` a `h3`.** Diverse griglie renderizzano card con `<h3>` senza un `<h2>` intermedio:
  - `sections/archive/issues-archive-grid.tsx` — card sotto l’hero `<h1>` dell’archive, senza `<h2>`
  - `sections/dossier/unpaginated-article-row.tsx` — griglia di `<h3>` senza heading di sezione
  - `sections/dossier/body-block.tsx` quando `BlockSectionIntro` ritorna `null`, cioè senza titolo/descrizione e senza `<h2>`
    Aggiungere un `<h2>` visually-hidden per sezione, oppure demotare i titoli delle card, così l’outline resta continuo.
- [ ] **SEO-2 `[MEDIA]`/S — L’indice archive ha il JSON-LD più sottile.**
      `buildIssuesArchiveJsonLd()` (`lib/seo/json-ld.ts`) emette solo `WebSite` + `BreadcrumbList`.
      Aggiungere un `CollectionPage` / `ItemList` che enumeri le issue: è il contenuto principale della pagina.
- [ ] **SEO-3 `[MEDIA]`/S — `Article.publisher` punta a un nodo `WebSite`.**
      `buildArticleJsonLd` imposta `publisher: { "@id": "...#website" }`, ma `#website` è tipizzato come `WebSite`, non `Organization`.
      Schema.org si aspetta una `Organization`, con `name` e `logo`. Emettere o referenziare un nodo `Organization` corretto.
      File: `lib/seo/json-ld.ts`.
- [x] **SEO-4 `[BASSA]`/S — ✅ FATTO (insieme ad A11Y-4).** Titoli colonne footer passati da `<h4>` a `<h2>`
      (`footer/public-footer-link-group.tsx`), stile visivo invariato.
- [ ] **SEO-5 `[BASSA]`/S — La data “updated” delle pagine statiche non è un `<time>`.**
      `pages/public-static-page.tsx` passa la data formattata come semplice `label` a `PublicMetaRail`, a differenza della pagina articolo.
      Passare `dateTime: page.updatedAt` così viene renderizzata come `<time dateTime>`.
- [ ] **SEO-6 `[BASSA]`/S — Fallback canonical delle pagine statiche.**
      `getPublicStaticPageData` fa fallback a `canonicalPath = "/"` per uno slug non registrato, producendo un canonical sbagliato verso la homepage.
      La route imposta `dynamicParams = false`, quindi slug sconosciuti non dovrebbero arrivare al componente.
      Confermare e rimuovere il fallback rischioso, oppure trasformarlo in 404.

---

## 4. Accessibilità

- [x] **A11Y-1 `[ALTA]`/S — ✅ FATTO (commit 46f2e5a).** Aggiunto `id="main-content"` al `<main>` di `loading.tsx`.
- [x] **A11Y-2 `[ALTA]`/M — ✅ FATTO. Gap screen-reader nell’audio player**
      (`components/public/listen/article-listen-player.tsx`):
  - ✅ `aria-valuetext` sulla seek `<input type="range">` → annuncia `"02:23 di 12:40"` invece del float raw.
  - ✅ Regione `role="status"` sr-only per lo stato play/pausa (cambia solo allo stato, non a ogni tick → niente spam SR);
    `role="status"` aggiunto anche al banner "Riprendi da …".
  - ✅ Messaggio di errore audio reso `role="alert"`.
  - ✅ `aria-current="true"` sulla chunk attiva + `role="group"`/`aria-label="Testo sincronizzato"` sulla regione.
  - ✅ `aria-pressed` + `aria-label="Velocità Nx"` sui bottoni velocità.
- [x] **A11Y-3 `[MEDIA]`/S — ✅ FATTO. Focus trap.** Sostituito `offsetParent !== null` con un helper
      `isElementVisible` basato su `getClientRects().length > 0` (non soffre del quirk del dialog `fixed`).
      (`header/public-header.tsx`)
- [x] **A11Y-4 `[MEDIA]`/S + SEO-4 — ✅ FATTO. Footer landmark + heading.**
      `footer/public-footer-link-group.tsx`: ogni gruppo ora è `<nav aria-label={title}>` e il titolo è passato
      da `<h4>` a `<h2>` (stile visivo invariato via `publicTypography.kicker`).
- [ ] **A11Y-5 `[MEDIA]`/M — Rail con scroll-jacking e focus tastiera.**
      `sections/archive/issues-archive-rail.tsx` trasla la track usando `window.scrollY`, non il focus.
      Un utente da tastiera che tabba verso una card off-screen non riesce a portarla in vista.
      Aggiungere un fallback, per esempio `overflow-x-auto` nativo, oppure mappare l’ordine di tab alla posizione di scroll.
- [ ] **A11Y-6 `[MEDIA]`/decisione — Policy sugli `alt` delle immagini.**
      Ogni immagine editoriale usa `alt={article.imageAlt ?? ""}`: hero, card dossier, blocchi lead/closing/feature e rich text.
      Alt vuoto = “decorativa”. È coerente e difendibile, perché il significato è già trasmesso da `<h3>`/`<h2>` nella card,
      ma va reso intenzionale: mantenere l’alt vuoto come policy dichiarata, oppure rendere obbligatorio `imageAlt` nel CMS /
      aggiungere un fallback derivato dal titolo per immagini lead/hero.
- [ ] **A11Y-7 `[BASSA]`/M — `<a>` full-card che wrappa `<article>` + heading**
      (`compounds/dossier-article-card.tsx`, e anche blocchi lead/closing/feature).
      Un link gigante ingloba l’heading. `aria-labelledby` mitiga, ma il pattern “stretched-link con heading come link”
      è più pulito sia per il link text SEO sia per la semantica del tab.
- [x] **A11Y-8 `[BASSA]`/S — ✅ VERIFICATO, nessuna modifica.** WCAG 2.5.3 è soddisfatto (containment
      case-insensitive): apri "Apri menu" ⊃ visibile "Menu"; chiudi "Chiudi menu" ⊃ visibile "Chiudi".
- [x] **A11Y-9 `[BASSA]`/S — ✅ FATTO.** Rimossi `tabIndex={-1}` e `focus:outline-none` ridondanti dal `<div>`
      interno di `pages/public-issue-dossier-page.tsx` (il `<main>` li ha già); mantenuto solo `flex flex-col`.

---

## 5. Refactor / codice morto

- [ ] **R-1 `[MEDIA]`/S — Eliminare shim e barrel dossier morti** → Quick win 0.
- [ ] **R-2 `[MEDIA]`/S — Rimuovere il re-export inutilizzato di `getBlockNumberingArticles`** → Quick win 0.
- [ ] **R-3 `[MEDIA]`/M — La card archive è implementata due volte.**
      `home/archive-section.tsx` e `sections/archive/issue-archive-card.tsx` definiscono indipendentemente la stessa mappa di stili a 3 varianti,
      già in drift: text-stroke `0.35px` vs `0.45px`, e markup quasi identico per card
      con numero di background / `StyledTitle` / meta row puntinata.
      Unificare in una sola card e una sola mappa varianti.
- [ ] **R-4 `[MEDIA]`/S — “Issue number indexing” duplicato 3×.**
      La logica “ordina oldest-first → mappa id→`formatIssueNumber(index)`” vive in `archive-section.tsx`
      (`getIssueNumbers`), `archive-view-model.ts` (`getArchiveIssueViewModels`) e `home-view-model.ts`
      (`getIssueOrderLabel`). Estrarre un helper condiviso.
- [ ] **R-5 `[MEDIA]`/L — Triplet dei feature block dossier.**
      `lead-block.tsx`, `feature-break-block.tsx`, `closing-block.tsx` — circa 110-130 righe ciascuno —
      condividono uno scheletro parallelo: risoluzione dell’articolo featured, blocco `next/image`,
      header con numero+eyebrow, `StyledTitle`, excerpt, `ArticleMeta`, `aria-labelledby`.
      Una primitiva condivisa `<DossierFeatureLink>` con slot layout/variant ridurrebbe molto il codice.
      Effort più alto: da fare dopo R-3.
- [ ] **R-6 `[MEDIA]`/S — `ArticleMeta` e `PublicMetaRail` duplicano** la join con separatore puntinato
      (`compounds/article-meta.tsx` vs `compounds/public-meta-rail.tsx`).
      Rendere `PublicMetaRail` l’unica implementazione e far delegare `ArticleMeta`.
- [ ] **R-7 `[BASSA]`/M — Interni dell’audio player.**
      Estrarre `useAudioPlayer(audioRef)` e `useAudioProgress({ articleId, ... })` da `article-listen-player.tsx`;
      unificare i quasi-identici `seekBy` / `handleSeekTo` in un solo `commitSeek(nextTime)`.
      Si collega a Perf-3.
- [ ] **R-8 `[BASSA]`/S — Rimuovere il wrapper passthrough** `composeNarrativeHomeBlocks` in `home-view-model.ts`,
      che inoltra soltanto a `resolveIssueHomeBlocks`.
- [ ] **R-9 `[BASSA]`/S — `unpaginated-article-row.tsx`** reimplementa inline la logica eyebrow;
      riusare `articleEyebrow()` da `dossier-format.ts`.
- [ ] **R-10 `[BASSA]`/S — `rich-text/public-rich-text.tsx`**: aggiungere un piccolo helper `renderChildren`
      per i body identici di `bulletList` / `orderedList` / `listItem` / `blockquote`;
      proteggere la join del testo di `codeBlock` con `typeof child.text === "string"`, per evitare `undefined\n` letterale.
- [ ] **R-11 `[BASSA]`/S — `block-section-intro.tsx`** testa `block.title` tre volte dentro una ternaria intricata;
      calcolare `hasTitle` una volta e ramificare in modo più pulito.
- [ ] **R-12 `[BASSA]`/S — `dossier-format.ts` `getArticleNumber`** ritorna silenziosamente `1` quando manca un id;
      aggiungere un commento, o un warn solo in dev, per spiegare il fallback.
- [ ] **R-13 `[BASSA]`/S — Guard di esaustività.**
      Aggiungere `default: never` agli `switch` su union chiuse in `dossier-home.tsx` (`renderBlock`) e
      `dossier-variant.ts`, così un nuovo block type fallisce a compile time.

---

## Note / non-problemi — verificati, nessuna azione

- Le chiavi `unstable_cache` per slug sono corrette: gli argomenti sono inclusi automaticamente nella cache key,
  confermato dalla documentazione. Nessuna collisione cross-slug nonostante i `keyParts` statici.
- Nessun `dangerouslySetInnerHTML` / superficie XSS nel rich text: tutti i nodi sono renderizzati in modo tipizzato
  e i link passano da `resolveSafeRichTextLinkHref`, con `rel="noopener noreferrer"` sui link esterni.
- La disciplina LCP di `next/image` è corretta: `priority` sull’hero dell’articolo e solo sul primo blocco dossier
  (`dossier-home.tsx` `index === 0`).
- I boundary dei componenti client sono minimi e tutti giustificati:
  `public-header`, `public-page-transition`, `home-scroll-progress`, `issues-archive-rail`, `article-listen-player`;
  cleanup di listener/observer/rAF corretto in ciascuno.
- ISR configurato correttamente: `revalidate = 3600` + `generateStaticParams` su route articolo/issue/listen;
  `dynamicParams = false` sul catch-all delle pagine statiche.
```
