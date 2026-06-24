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

- [x] **A-2 + Transizioni `[MEDIA]`/M — ✅ FATTO (codice; smoke test browser a te). `next-view-transitions@0.3.5`.**
      Compatibilità verificata: usa solo API pubbliche (`next/link`, `next/navigation`, hook React); l'unico
      riferimento interno è un import **type-only** (`app-router-context.shared-runtime`) presente in Next 16.2.9.
      Modifiche: 1. `<ViewTransitions>` hoisted in `app/(public)/layout.tsx` per avvolgere **tutto** l'albero
      (header/footer inclusi, altrimenti il `Link` della libreria lancia fuori dal provider). 2. `PublicLink` ora
      wrappa il `Link` della libreria. 3. **Rimossi** lo `scrollTo(0,0)` forzato e il `scroll={false}` indiscriminato
      → scroll restoration nativa di Next (chiude A-2). 4. `public-page-transition.tsx` eliminato (non più necessario). 5. CSS `::view-transition-old/new(.page-transition)` → `(root)` (la libreria usa il `startViewTransition`
      nativo, gruppo `root`). Verificato con typecheck + lint + `pnpm build` (route pubbliche ancora SSG/ISR).
      _Resta da fare a te: smoke test in browser — forward, back/forward, reduced-motion._

- [x] **A-3 `[L]` — ✅ FATTO (codice; verifica browser CMS a te). `cacheComponents: true` + `use cache`.**
      Eseguito su branch `feat/cache-components` (non su main). Modifiche: - `cacheComponents: true` in `next.config.ts`. - 6 data loader pubblici: `unstable_cache(...)` → `'use cache'` + `cacheLife("hours")` + `cacheTag(TAG)`
      (stessi tag → `revalidation.ts` su publish invariato). Rimosse le costanti `*_REVALIDATE_SECONDS` morte. - Rimossi i config incompatibili: `revalidate` (6 route), `dynamicParams=false` (`[slug]`), `runtime`/`dynamic`
      (5 route handler API). - **Boundary `<Suspense>` invece di "ogni pagina CMS"**: una sola boundary per gruppo basta — la sessione
      è letta nei _layout_ (`(cms)` e `(cms-preview)`), quindi avvolgendo lì la shell autenticata (children inclusi)
      si copre l'accesso request-time di tutte le 24 pagine. Più: `<Suspense>` sul gate di login e attorno al
      `CmsLoginForm` (`useSearchParams`), e boundary esterna su `(cms-preview)` (il provider `ViewTransitions`
      usa `usePathname` su route `[id]` dinamiche). - Verificato: `typecheck` + `lint` + `pnpm build` (76/76, route pubbliche PPR con Revalidate 1h/Expire 1d) +
      `test:run` (202/202, mock `next/cache` aggiornato a `cacheLife`/`cacheTag`). - **Resta a te (browser):** audit `<Activity>` sul CMS form-heavy — form dopo submit, dialog/focus,
      dropdown/popover, reset stati tra navigazioni; + conferma revalidation-on-publish e login/redirect.

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
3. **A-3 `use cache` → FATTO** su branch `feat/cache-components` (migrazione completa a Cache Components).

---

## Note / non-problemi — verificati, nessuna azione

- A-5: superato da A-2. Non si usa più l'API React `<ViewTransition>` (instabile): le transizioni passano da
  `next-view-transitions` (wrapper su `document.startViewTransition` nativo). `public-page-transition.tsx` rimosso.
- Cache key per-slug corretta anche con `use cache`: gli argomenti della funzione sono inclusi automaticamente nella cache key. Nessuna collisione cross-slug.
- Nessun `dangerouslySetInnerHTML` / superficie XSS nel rich text; link via `resolveSafeRichTextLinkHref` + `rel="noopener noreferrer"`.
- Disciplina LCP `next/image` corretta: `priority` su hero articolo e solo sul primo blocco dossier.
- Boundary client minimi e giustificati con cleanup corretto.
- Caching pubblico via Cache Components (A-3): `'use cache'` + `cacheLife("hours")` nei data loader + `generateStaticParams`; route pubbliche in Partial Prerender (Revalidate 1h / Expire 1d).
