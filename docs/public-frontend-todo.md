# Frontend pubblico — TODO residuo

Audit di `app/(public)/**` + `components/public/**` e dei livelli SEO/dati.
**Stato generale: buono.** Tutto ciò che era a basso rischio è già fatto; quanto resta è
o strutturale (L) o bloccato su una tua decisione.

Legenda effort: `S` ≤30min · `M` qualche ora · `L` più grande/strutturale.
Priorità: `[ALTA]` · `[MEDIA]` · `[BASSA]`.

---

## Attività ancora da fare (eseguibili senza verifica visiva)

- [x] **R-8 `[BASSA]`/S — ✅ FATTO.** Rimosso il wrapper passthrough `composeNarrativeHomeBlocks` da
      `home-view-model.ts`; `dossier-home.tsx` e il test ora chiamano direttamente `resolveIssueHomeBlocks`.
      Rimosso anche l'import circolare residuo (home-view-model non importa più resolve-issue-home-blocks).

- [x] **A11Y-5 `[MEDIA]`/M — ✅ FATTO (focus → scroll).** Aggiunto un handler `focusin` su `trackRef` in
      `issues-archive-rail.tsx`: quando una card focalizzata cade fuori dalla viewport orizzontale, fa
      `window.scrollBy({ top: delta })` della delta mancante, che — essendo la traslazione guidata da `scrollY` —
      la riporta in vista. Gated sulla stessa condizione del jacking (desktop ≥1024px + motion non ridotto), con
      cleanup del listener. Preserva il design esistente. _Logica deterministica; consigliata conferma con tab in browser._

- [x] **Perf-3 `[MEDIA]`/L — ✅ FATTO (shell statica estratta).** La shell statica è ora server-rendered e passata
      come slot `ReactNode` al client, quindi fuori dal client bundle: `ListenPlayerHeader` (kicker + `<h1>` + excerpt)
      e `ListenEmptyState` (fallback "Solo audio"), composti in `article-listen-page.tsx` (server) e passati come
      prop `header`/`emptyState` ad `ArticleListenPlayer`. Il client mantiene `<audio>`, controlli e `ChunkWindow`
      (dinamici). Nessuna modifica alla logica audio/IndexedDB. Verificato con typecheck + lint + `pnpm build`.
      _Nota: l'ulteriore split stateful (controlli vs chunk sincronizzati con stato condiviso) resta accoppiato a
      R-7 e richiede verifica browser → fuori da questo loop._

- [x] **A11Y-6 `[MEDIA]`/S — ✅ FATTO (opzione a).** Policy "alt vuoto = decorativo" resa esplicita e centralizzata
      in `editorialImageAlt()` (`lib/public/format/image.ts`), con commento di policy. I 5 call site (hero articolo,
      card dossier, lead/feature-break/closing block) ora usano il helper invece di `imageAlt ?? ""` inline. Output
      identico. Policy dichiarata anche in `docs/architecture.md` (Media Flow).

- [ ] **A-2 + Transizioni `[MEDIA]`/M — Adottare `next-view-transitions`. (DECISO: opzione 2)**
      Sostituire l'attuale `public-page-transition.tsx` (che forza `scrollTo(0,0)` + `scroll={false}` sui link)
      con il provider/`<Link>` di `next-view-transitions`. Passi: 1. Aggiungere la dipendenza e verificarne la compatibilità con la versione esatta di Next 16 in uso. 2. Avvolgere l'albero `(public)` con il provider; animazioni via CSS `::view-transition-old/new(...)`. 3. **Rimuovere lo `scrollTo(0,0)` forzato** e togliere `scroll={false}` indiscriminato dai `PublicLink`
      → lasciare a Next la scroll restoration nativa (questo chiude A-2: scroll su back/forward). 4. Smoke test: forward, back/forward, reduced-motion.

- [ ] **A-3 `[BASSA]`/L — `unstable_cache` → `use cache`. (DECISO: BACKLOG, no driver)**
      Resta in backlog: `unstable_cache` è deprecato ma funzionante. Il costo reale non è nei 6 file pubblici
      ma nell'avvolgere **ogni pagina CMS** in `<Suspense>` + audit `<Activity>` (multi-giorno, rischio sul
      form-heavy). Riaprire solo con un driver concreto di performance/correttezza.

---

## Rimandati — richiedono verifica visiva/browser (fuori da questo loop)

Tracciati per non perderli; vanno fatti con verifica manuale, non a tavolino:
`Perf-5` (rimozione peso font) · `R-3` (card archive duplicata) · `R-5` (triplet feature block dossier) ·
`R-7` (estrazione hook `useAudioPlayer`/`useAudioProgress`, verifica persistenza IndexedDB) ·
`A11Y-7` (stretched-link su full-card).

---

## Decisioni prese

1. **Policy `alt` immagini (A11Y-6) → (a)** alt vuoto = decorativo, dichiarato in doc. Nessuna modifica al CMS.
2. **Page transition (A-2) → (2)** `next-view-transitions`. Rimuovere scroll-hijack, scroll restoration nativa.
3. **A-3 `use cache` → BACKLOG.** Nessun driver; `unstable_cache` resta finché non emerge una ragione concreta.

---

## Note / non-problemi — verificati, nessuna azione

- A-5: `ViewTransition` è ancora API React instabile (`public-page-transition.tsx`); non danneggia l'LCP iniziale
  (si attiva solo sugli update). Da monitorare nei futuri upgrade Next/React.
- Le chiavi `unstable_cache` per slug sono corrette: gli argomenti sono inclusi nella cache key. Nessuna collisione.
- Nessun `dangerouslySetInnerHTML` / superficie XSS nel rich text; link via `resolveSafeRichTextLinkHref` + `rel="noopener noreferrer"`.
- Disciplina LCP `next/image` corretta: `priority` su hero articolo e solo sul primo blocco dossier.
- Boundary client minimi e giustificati con cleanup corretto.
- ISR corretto: `revalidate = 3600` + `generateStaticParams`; `dynamicParams = false` sul catch-all delle pagine statiche.
