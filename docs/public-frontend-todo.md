Certo — ecco la versione in italiano del documento che hai caricato:

```md
# Frontend pubblico — Audit & TODO

Audit di `app/(public)/**` + `components/public/**` e dei livelli SEO/dati che li alimentano, confrontati con le best practice di Next.js 16.2 / React 19. Verificato sui documenti locali in `node_modules/next/dist/docs`.

**Stato generale: buono.** Il sito pubblico è davvero server-first: ci sono solo 5 componenti client in `components/public`, tutti giustificati. Usa `next/image` ovunque, senza `<img>` raw, ha una base SEO completa (`sitemap.ts`, `robots.ts`, `manifest.ts`, `next/font`, `generateMetadata` per route, JSON-LD) e usa ISR (`revalidate = 3600` + `generateStaticParams`) con `unstable_cache` per deduplicare il doppio fetch metadata/pagina. Gli elementi sotto sono miglioramenti, non emergenze. Priorità:
`[ALTA]` da fare presto · `[MEDIA]` utile da fare · `[BASSA]` rifinitura/nice-to-have.

Legenda effort: `S` ≤30min · `M` qualche ora · `L` più grande/strutturale.

---

## 0. Quick wins — da fare prima

- [x] **`[ALTA]`/S — ✅ FATTO (commit 46f2e5a).** Aggiunto `id="main-content"` al `<main>` di `app/(public)/loading.tsx`.
- [x] **`[MEDIA]`/S — ✅ FATTO (commit 46f2e5a).** Eliminati i file morti (zero importatori): shim
      `sections/dossier/article-meta.tsx` + `sections/dossier/dossier-article-card.tsx`, barrel
      `sections/dossier/index.ts`, e re-export `getBlockNumberingArticles` in `dossier-view-model.ts`.
- [x] **`[BASSA]`/S — ✅ FATTO (commit 46f2e5a).** Rimosse le directory placeholder vuote
      `components/public/{home-v2,audio,motion}/` e `app/(public)/v2/`.

---

## 1. Architettura

- [x] **A-1 `[ALTA]`/M — ✅ FATTO. Le pagine pubbliche caricavano inutilmente client tRPC/React Query.**
      `TrpcProvider` + `<Toaster>` rimossi da `app/layout.tsx` (ora il root renderizza solo `{children}`) e
      spostati in `app/(cms)/cms/layout.tsx`, che avvolge le sole pagine CMS interattive. Verificato che
      `(auth)/cms/login` (login form senza trpc/toast) e `(cms-preview)` (toolbar server-only) non ne hanno
      bisogno. Risultato: pagine pubbliche, login e preview renderizzano senza il client tRPC/RQ/superjson/sonner.
- [ ] **A-2 `[MEDIA]`/M — ⛔ ROLLBACK. Scroll restoration su back/forward.**
      Il fix `popstate` su `public-page-transition.tsx` peggiorava sensibilmente la UX delle transizioni, quindi
      è stato **annullato** e il file è tornato identico all'originale. Il problema di fondo (scroll-to-top forzato a
      ogni navigazione che disturba il back/forward) resta aperto, ma va affrontato ripensando l'intero sistema di
      transizione, non con una patch puntuale. → vedi la sezione **"Sistemi di page transition per Next 16 (da valutare)"** in fondo.
- [ ] **A-3 `[BASSA]`/L — `unstable_cache` → `use cache` con Cache Components. (BACKLOG — piano pronto)**

  **Scoperta chiave:** non è una migrazione localizzata dei 6 file pubblici. `use cache` **richiede
  `cacheComponents: true`** in `next.config.ts`, che è un **flag globale**: cambia il comportamento dell'intera
  app (CMS incluso), non solo `lib/public/server/`. Da `migrating-to-cache-components.md`:
  - Tutte le pagine diventano **dynamic by default**; `revalidate` / `dynamic` / `fetchCache` vanno sostituiti
    con `use cache` + `cacheLife`.
  - **UI state preservation via React `<Activity>`**: lo stato dei componenti (input form, dialog, dropdown,
    scroll) **persiste** tra le navigazioni invece di smontarsi → rischio regressioni concentrato sul **CMS
    form-heavy** (tRPC/react-query, dialog, toast). È la parte più delicata.
  - `runtime = 'edge'` non supportato (qui è sempre `nodejs` → ok).

  **Stato attuale = corretto e supportato.** `unstable_cache` è solo _deprecato_, non rotto: questa è
  modernizzazione opt-in, non un fix. Procedere solo con un driver concreto.

  **Blast radius mappato nel repo:**
  - 6 file `lib/public/server/*` con `unstable_cache` (`revalidate: 3600` + `tags`).
  - 1 file `revalidation.ts` → `revalidateTag(tag, { expire: 0 })`, chiamato dai router tRPC
    `articles` / `issues` / `pages` su ogni mutazione CMS.
  - 6 route pubbliche con `export const revalidate = 3600`.
  - 4 route handler API con `runtime=nodejs` + `dynamic=force-dynamic` da riconciliare.

  **Piano fasato (reversibile — il flag si spegne in 1 riga):**
  1. **Spike di misura (read-only, ~1h).** Branch isolato: `cacheComponents: true` → `pnpm build` + `pnpm dev`.
     Next _forza_ errori su ogni accesso dati non-cached: il log È la mappa esatta del lavoro. Zero commit.
  2. **Data layer pubblico (6 file).** Profilo `cacheLife` condiviso; ogni
     `unstable_cache(fn, keys, {revalidate, tags})` → `'use cache'` + `cacheLife(...)` + `cacheTag(TAG)`.
     Opportunità: **tag per-slug** (es. `public-article:${slug}`) per invalidazione granulare invece di
     invalidare tutti i tag insieme.
  3. **Route config.** Rimuovere `export const revalidate = 3600` dalle 6 route (la cache vive ora nelle
     funzioni dati); verificare `generateStaticParams` / `dynamicParams=false`; riconciliare gli handler API.
  4. **Audit CMS (rischioso).** Test regressioni `<Activity>`: form dopo submit, dialog con focus,
     dropdown/popover, reset stati. Aggiungere cleanup dove serve.
  5. **Verifica.** `typecheck` + `lint` + `build` + smoke manuale pubblico/CMS + conferma che la
     revalidation-on-publish (mutazioni tRPC → `revalidateTag`) funzioni ancora.

  **Effort reale: L (multi-giorno), reversibile.** Raccomandazione: partire dalla Fase 1 (spike) prima di
  impegnarsi, così si misura il costo reale con dati invece che a stima.

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

- [x] **Perf-1 `[ALTA]`/M — ✅ FATTO (= A-1).** Provider tRPC/RQ/superjson/sonner rimossi dall’albero pubblico
      (spostati nel layout CMS). È la maggiore riduzione di JS sulle pagine pubbliche.
- [x] **Perf-2 `[MEDIA]`/M — ✅ FATTO. Re-render dell’audio player.**
      `visibleChunks` ora è in `useMemo` con chiave **`[chunks, activeChunkId]`** (non `currentTime`, che cambia a
      ogni tick e non darebbe alcun beneficio): `getVisibleAudioChunks` e il re-render di `ChunkWindow` scattano solo
      al cambio di chunk, non ~4×/sec. (`syncDuration` da `onTimeUpdate` lasciato: è già idempotente e no-op a durata nota.)
- [ ] **Perf-3 `[MEDIA]`/L — Separare la shell statica dell’audio player dal client bundle.** (resta — refactor strutturale)
      Il componente `"use client"` da 447 righe renderizza anche `<h1>` statico, excerpt e pannello chunk.
      Solo i controlli e `<audio>` devono stare nel client. Estrarre una shell server e un client `AudioControls` più piccolo.
      Si collega a Refactor-7, cioè estrazione degli hook.
- [x] **Perf-4 `[BASSA]`/S — ✅ FATTO.** Aggiunto `formats: ["image/avif", "image/webp"]` in `next.config.ts`.
- [ ] **Perf-5 `[BASSA]`/S — ⏸️ RINVIATO (non sicuro a tavolino).** I pesi font si applicano in base alla famiglia
      attiva (Archivo/Spectral/Mono) che cambia per contesto, e `font-medium` (500) / `font-light` (300) compaiono in
      componenti UI del CMS. Rimuovere un peso senza verifica visiva rischia regressioni tipografiche per guadagno modesto.
      Candidato plausibile: **Archivo 500** (usato solo in `components/ui/*`, probabilmente in font-sans/Spectral, non Archivo) —
      ma va confermato visivamente prima di togliere. Lasciato invariato.
- [x] **Perf-6 `[BASSA]`/S — ✅ FATTO.** `unoptimized` sui loghi SVG in `public-footer-brand.tsx` e `public-brand.tsx`
      (gli SVG non beneficiano dell’optimizer; inoltre `/brand/*.svg` non rientra nei `localPatterns` del config).
- [x] **Perf-7 `[BASSA]`/S — ✅ FATTO.** Rimosso `loading="lazy"` ridondante dall’`Image` in `public-rich-text.tsx`.
- [x] **Perf-8 `[BASSA]`/S — ✅ FATTO.** `home-scroll-progress.tsx` ora si iscrive all’evento `change` di
      `prefers-reduced-motion` e abilita/disabilita i listener di scroll/resize di conseguenza.

---

## 3. SEO

- [x] **SEO-1 `[MEDIA]`/M — ✅ FATTO. Gerarchia heading `h1 → h3` colmata** con `<h2>` sr-only per sezione:
  - `issues-archive-grid.tsx` — `<h2 class="sr-only">` (label `railAriaLabel`) prima della rail.
  - `unpaginated-article-row.tsx` — `<h2 class="sr-only">` con nuova label i18n `home.dossier.articlesLabel`.
  - `body-block.tsx` — `<h2 class="sr-only">` di fallback quando il blocco non ha `title` (altrimenti l'h2 visibile
    di `BlockSectionIntro`). Garantisce esattamente un `<h2>` per sezione.
- [x] **SEO-2 `[MEDIA]`/S — ✅ FATTO. JSON-LD archivio arricchito.**
      Aggiunto `buildArchiveCollectionPageJsonLd(issues)`: `CollectionPage` + `ItemList` che enumera le uscite
      (con `position`/`url`/`name`). `buildIssuesArchiveJsonLd(issues)` ora riceve la lista dal componente.
- [x] **SEO-3 `[MEDIA]`/S — ✅ FATTO. `Article.publisher` ora punta a una `Organization`.**
      Aggiunto nodo `buildOrganizationJsonLd()` (`#organization`, `name`, `url`, `logo` 180×180
      `/brand/apple-icon.png`), referenziato dal publisher dell'articolo e dal `WebSite`; incluso in tutti i grafi.
- [x] **SEO-4 `[BASSA]`/S — ✅ FATTO (insieme ad A11Y-4).** Titoli colonne footer passati da `<h4>` a `<h2>`
      (`footer/public-footer-link-group.tsx`), stile visivo invariato.
- [x] **SEO-5 `[BASSA]`/S — ✅ FATTO.** `public-static-page.tsx` ora passa `dateTime: page.updatedAt` al
      `PublicMetaRail` → la data "Aggiornato il…" è renderizzata come `<time dateTime>`.
- [x] **SEO-6 `[BASSA]`/S — ✅ FATTO. Fallback canonical reso self-referential.**
      Verificato: il data layer (`lib/public/server/page.ts`) già usa `/${slug}`; era solo il **componente** a usare
      `"/"`. Allineato a `` `/${page.slug}` `` → niente più canonical/breadcrumb errato verso la homepage.

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

- [x] **R-1 `[MEDIA]`/S — ✅ FATTO (commit 46f2e5a).** Eliminati shim e barrel dossier morti → Quick win 0.
- [x] **R-2 `[MEDIA]`/S — ✅ FATTO (commit 46f2e5a).** Rimosso il re-export inutilizzato di `getBlockNumberingArticles` → Quick win 0.
- [ ] **R-3 `[MEDIA]`/M — ⏸️ RINVIATO (rischio visivo). La card archive è implementata due volte.**
      `home/archive-section.tsx` e `sections/archive/issue-archive-card.tsx` definiscono indipendentemente la stessa mappa di stili a 3 varianti,
      già in drift: text-stroke `0.35px` vs `0.45px`, e markup quasi identico per card
      con numero di background / `StyledTitle` / meta row puntinata.
      Unificare in una sola card e una sola mappa varianti. **Da fare con verifica visiva** (le due card hanno layout
      diversi — grid vs full-bleed — e il drift di stile va riconciliato deliberatamente, non a tavolino.)
- [x] **R-4 `[MEDIA]`/S — ✅ FATTO.** Estratti `buildIssueNumberMap(issues)` e `getIssueOrderIndex(issues, id)`
      in `lib/public/format/issue.ts`; i 3 call site (`archive-section`, `archive-view-model`, `home-view-model`)
      ora li riusano. Output identico.
- [ ] **R-5 `[MEDIA]`/L — ⏸️ RINVIATO (rischio visivo). Triplet dei feature block dossier.**
      `lead-block.tsx`, `feature-break-block.tsx`, `closing-block.tsx` — circa 110-130 righe ciascuno —
      condividono uno scheletro parallelo: risoluzione dell’articolo featured, blocco `next/image`,
      header con numero+eyebrow, `StyledTitle`, excerpt, `ArticleMeta`, `aria-labelledby`.
      Una primitiva condivisa `<DossierFeatureLink>` con slot layout/variant ridurrebbe molto il codice.
      Effort più alto: da fare dopo R-3, **con verifica visiva** (i 3 blocchi hanno layout/posizionamenti distinti).
- [x] **R-6 `[MEDIA]`/S — ✅ FATTO.** `ArticleMeta` ora delega a `PublicMetaRail` (passando `className` con
      `text-xs`+tone e `separatorClassName`); markup renderizzato identico. `PublicMetaRail` è l'unica implementazione.
- [ ] **R-7 `[BASSA]`/M — Interni dell’audio player.**
      Estrarre `useAudioPlayer(audioRef)` e `useAudioProgress({ articleId, ... })` da `article-listen-player.tsx`;
      unificare i quasi-identici `seekBy` / `handleSeekTo` in un solo `commitSeek(nextTime)`.
      Si collega a Perf-3.
- [ ] **R-8 `[BASSA]`/S — Rimuovere il wrapper passthrough** `composeNarrativeHomeBlocks` in `home-view-model.ts`,
      che inoltra soltanto a `resolveIssueHomeBlocks`.
- [x] **R-9 `[BASSA]`/S — ✅ FATTO (insieme a SEO-1).** `unpaginated-article-row.tsx` ora usa
      `articleEyebrow()` da `dossier-format.ts` invece di reimplementare `formatTags(...) || categoryName || ""`.
- [x] **R-10 `[BASSA]`/S — ✅ FATTO.** Aggiunto helper `renderBlockChildren` per i body identici di
      `bulletList`/`orderedList`/`listItem`/`blockquote`; join del `codeBlock` protetta con `typeof child.text === "string"`.
- [x] **R-11 `[BASSA]`/S — ✅ FATTO.** `block-section-intro.tsx` calcola `hasTitle`/`hasDescription` una volta;
      struttura preservata identica (incluso il divider sotto il titolo quando manca la description).
- [x] **R-12 `[BASSA]`/S — ✅ FATTO.** Aggiunto commento sul fallback `?? 1` di `getArticleNumber`.
- [x] **R-13 `[BASSA]`/S — ✅ FATTO.** Aggiunti guard `default: never` agli `switch` di `renderBlock`
      (`dossier-home.tsx`) e `getNarrativeVariantClasses` (`dossier-variant.ts`).

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

---

## Sistemi di page transition per Next 16 (da valutare)

Contesto: l'implementazione attuale (`public-page-transition.tsx` + `public-link.tsx`) usa la `<ViewTransition>`
nativa di React e **forza `window.scrollTo(0,0)` in `onUpdate`** mentre `PublicLink` mette `scroll={false}` su
ogni link interno. Questa combinazione è la causa sia del fastidio percepito nella transizione sia del problema di
scroll restoration su back/forward. Il fix puntuale `popstate` (commit `d18fb72`, poi annullato) peggiorava la UX,
quindi il tema va affrontato scegliendo **un** sistema strutturato tra i seguenti, non con patch locali.

**Vincolo trasversale (vale per tutte le opzioni):** lasciare a Next la scroll restoration nativa — rimuovere lo
`scrollTo(0,0)` forzato e non disabilitare `scroll` sui `Link` in modo indiscriminato. Il forced-scroll è ciò che
ha rotto sia il forward sia il back/forward.

1. **`<ViewTransition>` React (attuale) ma senza hijack dello scroll** — `[BASSA-MEDIA]`/M
   Mantiene l'API già in uso (sperimentale ma supportata su React 19 / Next 16), definisce le animazioni via CSS
   `::view-transition-old/new(...)` e i `view-transition-name`, e **rimuove la logica di scroll** lasciando il
   default di Next. È il delta minimo rispetto a oggi. Rischio: API React ancora instabile (vedi A-5).

2. **`next-view-transitions` (wrapper community)** — `[MEDIA]`/M
   Provider + `<Link>` che avvolgono `document.startViewTransition()` attorno alle navigazioni App Router.
   Maturo, pensato per l'App Router, gestisce il timing meglio di una `onUpdate` manuale. Aggiunge una dipendenza
   e va verificata la compatibilità con la versione esatta di Next 16. Animazioni sempre via CSS view-transition.

3. **`template.tsx` + animazione CSS d'ingresso** — `[BASSA]`/S-M
   Un `app/(public)/template.tsx` viene **re-montato a ogni navigazione** (a differenza del layout): consente una
   enter-animation puramente CSS (keyframe su mount) senza JS, senza toccare lo scroll, con bundle ~zero.
   Opzione più leggera e prevedibile; non fa transizioni "shared element" ma copre il fade/slide di pagina.

4. **Motion / `AnimatePresence`** — `[MEDIA-ALTA]`/L — _sconsigliata salvo necessità di animazioni complesse_
   Richiede `template.tsx` con `key={pathname}` e workaround noti per le exit-animation nell'App Router, più peso
   sul client bundle. Da considerare solo se servono coreografie elaborate non esprimibili con le View Transitions.

**Da NON fare** (regressioni già osservate): forzare `scrollTo(0,0)` in `onUpdate`/`useEffect` e mettere
`scroll={false}` su tutti i `Link`. La gestione scroll è responsabilità del router.
```
