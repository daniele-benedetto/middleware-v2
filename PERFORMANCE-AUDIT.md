# Performance Audit — middleware-v2

Data: 2026-11-24 · Ambito: sito pubblico (home, articolo, risultati questionario) su build di produzione locale · Skill usate: `performance`, `core-web-vitals`, `vercel-react-best-practices`.

> **Aggiornamento 2026-11-24:** gli interventi approvati sono stati implementati sul branch `perf/audit-fixes` (worktree `.claude/worktrees/perf-work`) e misurati. Esito, misure prima/dopo e interventi scartati sono nella **sezione 7**. La SEO è stata verificata invariata (sezione 7.4).

## Sintesi

| Gravità | N.  | Temi                                                                                                                                                                                                                                                   |
| ------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1      | 3   | Recharts (~120 KB gzip) caricato in home senza grafici visibili; CSS globale render-blocking da 163 KB; CLS da header in streaming (conferma SEO P2-7)                                                                                                 |
| P2      | 7   | Font sopra budget, immagine LCP articolo senza `fetchpriority`, tRPC/React Query su tutte le pagine pubbliche, dizionario i18n CMS nel client, pagina risultati con 5.942 nodi DOM e 19 grafici montati subito, favicon SVG da 141 KB, HTML `no-store` |
| P3      | 5   | Polyfill legacy, handler di scroll non throttled, prefetch RSC duplicati, logo header sovradimensionato, verifica consegna in produzione (Caddy)                                                                                                       |

**Quadro generale.** La base è buona: Cache Components con `'use cache'` + tag, immagini AVIF/WebP con `sizes`, lazy loading sotto la piega, Leaflet caricato on-demand con `IntersectionObserver`, ricerca della home in `next/dynamic`. L'INP misurato è ottimo (~64 ms con CPU 4×). Il TTFB del server è basso (3–55 ms in locale, senza throttling).

Il collo di bottiglia su mobile è il **percorso critico di rendering**: un foglio CSS unico da 28 KB gzip (pubblico + CMS + Leaflet) compete in rete con ~365 KB di JS e 7 font precaricati. Il primo paint arriva solo a ~2,9 s in Slow 4G. Su desktop senza throttling LCP è 367 ms.

---

## 1. Condizioni di misura

| Voce          | Valore                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build         | `pnpm build` (Turbopack) + `next start` su `localhost:3100`                                                                                                                         |
| Versione      | Next.js 16.4.4 per le prime tracce, poi 16.4.6 (commit `3b9c820`) in un worktree isolato `.claude/worktrees/perf-baseline`. Le metriche delle due versioni coincidono entro ±60 ms. |
| Browser       | Chrome via Chrome DevTools MCP, contesto isolato, cache disabilitata (cold load)                                                                                                    |
| Mobile        | 412×823, DPR 1,75, touch, **Slow 4G**, **CPU 4×**                                                                                                                                   |
| Desktop       | 1440×900, DPR 1, nessun throttling                                                                                                                                                  |
| Protocollo    | HTTP/1.1 senza TLS (locale). In produzione Caddy serve HTTP/2–3: il contendimento delle connessioni misurato qui è **peggiore** che in produzione, ma il peso dei byte resta valido |
| Consenso      | Banner cookie già accettato (tranne la prima traccia)                                                                                                                               |
| Dati di campo | **Non disponibili**: nessun record CrUX per localhost; produzione non raggiungibile dalla sandbox. Nessuna RUM configurata (Umami non raccoglie i Web Vitals)                       |

### Nota sulla build

La prima `pnpm build` si è fermata con `SecurityFatalError`: Next.js 16.4.4 è segnalato come affetto da una vulnerabilità nota. Durante l'audit il progetto è stato aggiornato a 16.4.6 da un'altra sessione (commit `3b9c820`); le misure finali usano questa versione.

## 2. Metriche iniziali (baseline)

### Lab — mobile (Slow 4G, CPU 4×)

| Pagina                         | LCP (mediana, range)            | Elemento LCP                     | FCP   | CLS                    | JS trasferito      | DOM       |
| ------------------------------ | ------------------------------- | -------------------------------- | ----- | ---------------------- | ------------------ | --------- |
| `/`                            | **2.890 ms** (2.877–2.935, n=3) | testo `<p>` Spectral italic      | ≈ LCP | **0,12** / 0,00 / 0,00 | 365 KB (18 script) | 799       |
| `/articoli/perche-un-magazine` | 2.525 ms (n=1)                  | immagine copertina (AVIF, 17 KB) | —     | 0,01                   | 229 KB             | 272       |
| `/questionari/…/risultati`     | 2.929 ms (n=1)                  | testo                            | ≈ LCP | 0,00                   | 349 KB             | **5.942** |

Scomposizione LCP home: TTFB 563 ms (dominato dall'RTT simulato) + **render delay 2.314 ms**. L'insight `RenderBlocking` stima un risparmio di **~1.110 ms** su FCP/LCP (CSS principale scaricato tra 1.520 e 2.437 ms).

Scomposizione LCP articolo: TTFB 563 + load delay 196 + **load duration 1.750 ms** (di cui ~807 ms in coda prima dell'invio: priorità iniziale `Low`) + render delay 17 ms.

### Lab — desktop (senza throttling)

| Pagina | LCP    | CLS      |
| ------ | ------ | -------- |
| `/`    | 367 ms | **0,05** |

### Interattività (mobile, CPU 4×)

| Interazione                                 | Durata evento (≈ INP)                   |
| ------------------------------------------- | --------------------------------------- |
| Toggle "Tabella" (blocco questionario home) | 56–64 ms                                |
| Apertura "Indice del numero"                | 64 ms                                   |
| Long task durante il caricamento della home | 1 (70 ms) → TBT ≈ 20 ms                 |
| Forced reflow su `/risultati`               | 102 ms (Recharts `ResponsiveContainer`) |

### Peso risorse home (mobile, cold)

| Tipo                    | Misurato                                                                             | Budget iniziale | Stato                                                        |
| ----------------------- | ------------------------------------------------------------------------------------ | --------------- | ------------------------------------------------------------ |
| JS (compresso)          | ~365 KB (~447 KB incluso il chunk polyfill `nomodule`, ignorato dai browser moderni) | < 300 KB        | **sopra**                                                    |
| CSS (compresso)         | 28,5 KB + 1,7 KB font-face                                                           | < 100 KB        | ok, ma render-blocking e troppo lento da scaricare su mobile |
| Font                    | 7 woff2 precaricati, ~126 KB                                                         | < 100 KB        | **sopra**                                                    |
| Immagini above-the-fold | 25 KB                                                                                | < 500 KB        | ok                                                           |
| HTML                    | 50 KB compresso (294 KB decompresso)                                                 | —               | ok                                                           |
| Favicon `icon0.svg`     | **141 KB**                                                                           | —               | spreco                                                       |

### Composizione dei chunk JS più pesanti (home)

| Chunk              | gzip   | Contenuto                                                              |
| ------------------ | ------ | ---------------------------------------------------------------------- |
| `1nfvd4c1f3xcr.js` | 122 KB | **Recharts** + immer + redux (nessun grafico Recharts montato in home) |
| `0tc75ur1nplml.js` | 73 KB  | React DOM                                                              |
| `04gt5upzx8s6c.js` | 47 KB  | Runtime Next / RSC client                                              |
| `0cz1d0mv5g_q7.js` | 39 KB  | Polyfill `nomodule`, presente **due volte** nell'HTML                  |
| `2xsyamo0je53s.js` | 25 KB  | TanStack React Query                                                   |
| `05k3-3-gp5dc8.js` | 19 KB  | Dizionario i18n, **comprese le stringhe del CMS**                      |
| `07xem2td1721o.js` | 12 KB  | tRPC client + superjson                                                |

---

## 3. Problemi rilevati

Legenda: **Impatto** = guadagno atteso sulle metriche · **Complessità** = sforzo di implementazione · **Rischio** = rischio di regressione visiva/funzionale/SEO.

### P1-1 — Recharts caricato in home senza grafici visibili

| Impatto                                                          | Complessità | Rischio |
| ---------------------------------------------------------------- | ----------- | ------- |
| Alto: −122 KB gzip (−416 KB raw) di JS sulla home, ~⅓ del totale | Bassa       | Basso   |

**Evidenza.** `components/public/sections/dossier/dossier-home.tsx:17` importa staticamente `QuestionnaireAnalysisHomeBlock`. Questo importa `AnalysisFieldResults`, che importa i renderer in `components/public/sections/questionnaires/charts/*` (`recharts`). Nella home misurata il chunk Recharts viene scaricato ed eseguito, ma `document.querySelectorAll('.recharts-wrapper').length === 0`: la prima domanda mostra barre CSS e il blocco è a fondo pagina.

**Intervento.** Caricare i renderer basati su Recharts (`boolean-pie-chart`, `percentage-column-chart`, `numeric-frequency-area`, `histogram`, …) con `next/dynamic` dentro `analysis-field-renderer.tsx`. Il placeholder deve avere la stessa altezza di `ChartShell`, per non introdurre CLS. Le barre CSS e la tabella restano invariate.

**Verifica.** Chunk Recharts assente dalla home al load; grafici identici (screenshot) quando si seleziona una domanda con grafico; CLS invariato.

### P1-2 — CSS globale unico e render-blocking

| Impatto                                                                           | Complessità            | Rischio                 |
| --------------------------------------------------------------------------------- | ---------------------- | ----------------------- |
| Alto su mobile: stima DevTools −1,1 s FCP/LCP in Slow 4G/HTTP 1.1; meno in HTTP/2 | Media (2a) / Alta (2b) | Basso (2a) / Medio (2b) |

**Evidenza.** Un solo foglio da 163 KB raw / 28,5 KB gzip / 22,9 KB brotli (`app/globals.css`) per tutte le route. Contiene:

- `@import "leaflet/dist/leaflet.css"` (~10,7 KB di regole), che serve solo alle mappe;
- tutte le utility Tailwind del CMS;
- `tw-animate-css` e `shadcn/tailwind.css`.

`RenderBlocking` lo indica come la richiesta più costosa del percorso critico su tutte e tre le pagine.

**Intervento.**

- **2a (consigliato subito):** spostare l'import di `leaflet.css` nei componenti mappa (`map-home-canvas.tsx` e il componente mappa del CMS). Next lo emette come CSS di chunk caricato solo dove serve.
- **2b (strutturale, da valutare dopo):** separare il CSS del CMS da quello pubblico: un entry CSS per il gruppo `(cms)` con `@source` dedicati e un entry pubblico. Richiede di verificare che nessuna classe condivisa vada persa.

**Verifica.** Dimensione del CSS critico prima/dopo; screenshot di home, articolo, mappa (pubblica e CMS) a confronto; RenderBlocking ricalcolato.

### P1-3 — CLS da header in streaming (conferma di SEO P2-7)

| Impatto                                                                              | Complessità | Rischio |
| ------------------------------------------------------------------------------------ | ----------- | ------- |
| Alto: CLS 0,12 mobile (1 run su 3, sopra la soglia 0,1) e 0,05 desktop (sistematico) | Bassa       | Basso   |

**Evidenza.** `CLSCulprits`: gli elementi spostati sono lo shell `div[data-public-shell]` e `div[data-public-page-content]`, a 2.465 ms e a 2.849 ms. In `app/(public)/layout.tsx` header, sub-header e footer sono in `<Suspense fallback={null}>` con `await connection()`. Lo shell statico viene disegnato senza header (74 px sticky), poi l'header arriva e spinge giù il contenuto. Il fenomeno è intermittente su mobile perché dipende da quando arriva lo stream rispetto al primo paint. Su desktop è sistematico.

**Intervento** (lo stesso già proposto nello SEO audit, da coordinare per non duplicarlo):

- **Opzione A (minima):** fallback con altezza riservata (`h-[var(--public-header-height)]` + bordo) per l'header. Per il sub-header, riservare `--public-issue-nav-height` solo sulle route che lo mostrano.
- **Opzione B (preferibile, vedi anche P2-7):** togliere `connection()` da header e footer. `getPublicNavigation()` è già `'use cache'` con tag e invalidazione, quindi entrano nello shell statico. Così si eliminano CLS e pop-in, e header e footer sono già nel primo paint.

**Verifica.** CLS ≤ 0,01 su 3 run mobile + 3 desktop; header visivamente identico; menu funzionante.

### P2-1 — Font: 7 file precaricati (~126 KB) e pesi inutilizzati

| Impatto                                                        | Complessità | Rischio                  |
| -------------------------------------------------------------- | ----------- | ------------------------ |
| Medio: −30/60 KB sul percorso critico, meno contesa con il CSS | Bassa       | Medio (resa tipografica) |

**Evidenza.** `app/layout.tsx` carica Archivo in 6 pesi (400–900) e Spectral in 3 pesi × 2 stili. Spectral 300 compare solo nel CMS (`components/cms/primitives/typography.tsx:136`, `font-light`). Nel pubblico `font-medium` (500) ha solo 2 occorrenze. L'elemento LCP della home è testo Spectral _italic_: quel file va mantenuto in preload.

**Intervento.**

1. Spostare Spectral 300 in un'istanza `next/font` caricata solo dal layout CMS, oppure con `preload: false`.
2. Valutare Archivo come font variabile (omettendo `weight`): un file invece di 6.
3. Controllare `font-medium` e decidere con il design se mantenerlo.

**Verifica.** Confronto screenshot pixel per pixel di titoli e testo; numero e peso dei font in preload.

### P2-2 — Immagine LCP dell'articolo senza `fetchpriority="high"`

| Impatto                                                          | Complessità | Rischio |
| ---------------------------------------------------------------- | ----------- | ------- |
| Medio: fino a −0,5/0,8 s di load delay misurato (coda di 807 ms) | Bassa       | Basso   |

**Evidenza.** `LCPDiscovery` su `/articoli/perche-un-magazine`: _"fetchpriority=high should be applied: FAILED"_, priorità iniziale `Low`, richiesta accodata a 759 ms e inviata a 1.566 ms. `ArticleCoverImage` (`components/public/article-cover-image.tsx`) passa solo `preload`.

**Intervento.** Aggiungere `fetchPriority="high"` quando `preload` è attivo, in `ArticleCoverImage`, `listen-cover.tsx`, nell'hero della lezione (`public-lesson-page.tsx`) e in `public-page-hero.tsx` se above-the-fold.

### P2-3 — tRPC + React Query su tutte le pagine pubbliche

| Impatto                                                          | Complessità | Rischio |
| ---------------------------------------------------------------- | ----------- | ------- |
| Medio: ~37 KB gzip di JS (React Query + tRPC client + superjson) | Media       | Medio   |

**Evidenza.** `TrpcProvider` avvolge l'intero `app/(public)/layout.tsx`. Lato client tRPC è usato solo da:

- la ricerca: `public-search-menu-results.tsx`, che si apre al click;
- la pagina di compilazione questionario: `public-questionnaire-page.tsx`, che sta in un altro gruppo di route.

Il provider usa inoltre `cmsQueryClientDefaultOptions`, cioè le opzioni pensate per il CMS.

**Intervento.** Spostare il provider dentro il dialog di ricerca (già caricabile con `next/dynamic`) e nella pagina questionario. Rimuoverlo dal layout pubblico.

**Verifica.** Ricerca e invio del questionario funzionanti; chunk React Query assente da home e articolo.

### P2-4 — Dizionario i18n del CMS incluso nel bundle pubblico

| Impatto                     | Complessità | Rischio |
| --------------------------- | ----------- | ------- |
| Basso-medio: ~15/19 KB gzip | Bassa-media | Basso   |

**Evidenza.** Il chunk `05k3-3-gp5dc8.js` contiene stringhe come _"Slug generato automaticamente"_ e _"Pubblicazione e stato"_. I client component pubblici importano `i18n` da `@/lib/i18n`, che espone l'intero albero.

**Intervento.** Esportare un modulo `@/lib/i18n/public` (solo `i18n.public`) e usarlo nei client component pubblici. Il testo resta identico.

### P2-5 — Pagina risultati: DOM enorme e 19 grafici montati al load

| Impatto                                                                          | Complessità           | Rischio     |
| -------------------------------------------------------------------------------- | --------------------- | ----------- |
| Medio: rendering iniziale, memoria, forced reflow di 102 ms, INP su device lenti | Bassa (A) / Media (B) | Basso-medio |

**Evidenza.** `/questionari/lavoro-sociale-sacca-crocetta/risultati`: 5.942 nodi DOM, 19 `.recharts-wrapper` montati subito, forced reflow di 102 ms attribuito a Recharts, HTML di 597 KB decompressi (51 KB compressi).

**Intervento.**

- **A:** `content-visibility: auto` + `contain-intrinsic-size` sulle sezioni domanda fuori viewport. Visivamente neutro; va verificato il salto agli anchor della sidebar.
- **B:** montare i grafici quando entrano nel viewport (`IntersectionObserver`), con un placeholder della stessa altezza.

### P2-6 — `icon0.svg` da 141 KB

| Impatto                                                   | Complessità | Rischio |
| --------------------------------------------------------- | ----------- | ------- |
| Basso-medio: 141 KB a ogni primo accesso, anche su mobile | Bassa       | Basso   |

**Evidenza.** `app/icon0.svg` è un SVG che incapsula un PNG 2421×2421 in base64 (generato da RealFaviconGenerator). Il browser lo scarica a ogni prima visita.

**Intervento.** Sostituire il contenuto con un vettoriale vero oppure con un PNG ridotto (≤ 512 px), mantenendo nome e percorso. I metadata e i riferimenti SEO restano invariati.

### P2-7 — HTML pubblico `Cache-Control: private, no-store`

| Impatto                                                   | Complessità         | Rischio |
| --------------------------------------------------------- | ------------------- | ------- |
| Da misurare: eleggibilità bfcache, back/forward più lenti | Bassa (segue P1-3B) | Basso   |

**Evidenza.** `curl -I /` → `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`. Dipende dai buchi dinamici con `connection()` nel layout (header, footer, banner, analytics).

**Ipotesi.** `no-store` può rendere le pagine non eleggibili al back/forward cache in Chrome, a seconda della versione e delle condizioni.

**Verifica.** DevTools → Application → Back/forward cache su home e articolo. Se P1-3B porta header e footer nello shell statico, restano dinamici solo banner e analytics.

### P3 — Miglioramenti minori

1. **Polyfill legacy / `nomodule` duplicato.** `LegacyJavaScript` segnala 14,1 KB evitabili. Il chunk `nomodule` compare due volte nell'HTML (comportamento interno di Next; i browser moderni lo ignorano). Valutare un `browserslist` moderno: rischio sul supporto dei browser vecchi, quindi va deciso il target.
2. **`public-reading-depth.tsx`.** L'handler di scroll non è throttled (`getBoundingClientRect` + `scrollHeight` a ogni evento) e resta attivo dopo il 100%. Usare `requestAnimationFrame` e staccare il listener quando tutte le milestone sono tracciate.
3. **Prefetch RSC duplicati.** Ogni link del footer viene prefetchato due volte con chiavi `_rsc` diverse (6 richieste per 3 link). Da investigare: probabilmente due prefetch con strategie diverse sullo stesso link.
4. **Logo header.** `middleware-logo-extended-black.png` (sorgente 345 KB) viene servito a `w=640` per un logo di ~221×33 px CSS. Il trasferimento è solo 4 KB, ma è in preload. Aggiungere `sizes` adeguato o usare un SVG.
5. **Consegna in produzione da verificare (Caddy).** Il `Caddyfile` non è nel repo. Verificare `encode zstd gzip` (Next comprime solo in gzip), HTTP/2–3 e header di cache su `/_next/static` (immutable) e `/_next/image`.

---

## 4. Piano di intervento

Ordine pensato per massimizzare il guadagno con il minimo rischio. Ogni passo è indipendente e reversibile.

| Fase | ID                     | Intervento                                                                           | Impatto atteso                    | Rischio     |
| ---- | ---------------------- | ------------------------------------------------------------------------------------ | --------------------------------- | ----------- |
| 1    | P1-1                   | `next/dynamic` per i grafici Recharts                                                | −122 KB gzip JS home              | Basso       |
| 1    | P1-3                   | Header/footer nello shell statico (o fallback con altezza) — coordinato con SEO P2-7 | CLS → ~0                          | Basso       |
| 1    | P2-2                   | `fetchPriority="high"` sulle immagini LCP                                            | LCP articolo −0,3/0,8 s (ipotesi) | Basso       |
| 1    | P2-6                   | Favicon SVG leggero                                                                  | −140 KB prima visita              | Basso       |
| 2    | P1-2a                  | `leaflet.css` solo nei componenti mappa                                              | −10,7 KB raw CSS critico          | Basso       |
| 2    | P2-1                   | Riduzione pesi/preload font                                                          | −30/60 KB critico                 | Medio       |
| 2    | P2-4                   | Dizionario i18n pubblico separato                                                    | −15/19 KB JS                      | Basso       |
| 2    | P2-5                   | `content-visibility` / mount lazy grafici risultati                                  | DOM e reflow iniziali             | Basso-medio |
| 2    | P3-2, P3-4             | Reading depth con rAF, `sizes` logo                                                  | Fluidità, byte                    | Basso       |
| 3    | P2-3                   | `TrpcProvider` solo dove serve                                                       | −37 KB JS                         | Medio       |
| 3    | P1-2b                  | CSS CMS separato dal pubblico                                                        | CSS critico −30/50% (stima)       | Medio       |
| 3    | P2-7, P3-1, P3-3, P3-5 | bfcache, browserslist, prefetch, Caddy                                               | Da misurare                       | Variabile   |

**Obiettivo realistico dopo le fasi 1–2** (ipotesi da confermare con le misure):

- JS home sotto i 250 KB gzip;
- CLS ≤ 0,02;
- LCP mobile home da ~2,9 s a ~2,2–2,4 s in Slow 4G/CPU 4×;
- LCP desktop invariato (~0,4 s).

## 5. Protocollo di verifica (per ogni intervento approvato)

1. Build di produzione nel worktree, stesse condizioni della sezione 1 (mobile Slow 4G/CPU 4× + desktop), cold cache, **3 run, mediana e range**.
2. Metriche confrontate: LCP (con scomposizione), CLS, FCP, JS/CSS/font trasferiti, DOM, long task, INP su "Indice" e "Tabella".
3. **Regressione visiva:** screenshot full-page prima/dopo di home, articolo, lezione, risultati, mappa, in mobile e desktop, più verifica manuale delle animazioni (menu, indice, transizioni immagini).
4. **SEO invariata:** diff del `<head>` (title, meta, canonical, OG/Twitter) e del JSON-LD via `curl` prima/dopo; `robots.txt` e `sitemap.xml` identici.
5. `pnpm lint && pnpm typecheck && pnpm test:run`.
6. Dati di campo: valutare `web-vitals` → Umami (evento custom) per avere LCP/INP/CLS reali dopo il deploy. È un intervento separato da approvare.

## 6. Limiti dell'audit

- Nessun dato di campo (CrUX/RUM): le priorità si basano su misure di laboratorio.
- In locale si usa HTTP/1.1: in produzione (HTTP/2–3 via Caddy) il guadagno di P1-2 e P2-2 sarà probabilmente minore in ms, ma resta valido in byte.
- Pagine misurate: home, un articolo, risultati questionario. Non tracciate: archivio uscite, contro-formazione, pagine "ascolta" (player audio da 921 righe: da verificare l'INP sullo scrubbing).
- Il working tree principale era in modifica da un'altra sessione (fix SEO + upgrade Next). La baseline 16.4.6 è stata presa da un worktree pulito su `HEAD` (`3b9c820`), senza quelle modifiche non committate.

---

## 7. Esito degli interventi (branch `perf/audit-fixes`)

### 7.1 Metodo di misura aggiornato

In locale `next start` serve **HTTP/1.1**. Con il limite di 6 connessioni per host, i font precaricati via header `Link` occupano le connessioni e il CSS resta in coda per ~900 ms: è un collo di bottiglia che in produzione (Caddy, HTTP/2–3) non esiste e che nasconde i guadagni in byte. Per misure fedeli alla produzione ho messo un **reverse proxy HTTP/2 + TLS** (Node `http2`, certificato self-signed solo per localhost) davanti a entrambe le build:

- baseline `HEAD 3b9c820` (Next 16.4.6) su `https://localhost:8443`;
- branch su `https://localhost:8444`.

Le run sono alternate, a cache vuota, mobile 412×823 DPR 1,75 Slow 4G CPU 4× e desktop 1440×900 senza throttling. Entrambe le build sono state fatte con il DB raggiungibile, vedi 7.6.

### 7.2 Metriche prima → dopo (lab, HTTP/2)

| Pagina / profilo       | Metrica                                | Baseline               | Branch                             | Delta              |
| ---------------------- | -------------------------------------- | ---------------------- | ---------------------------------- | ------------------ |
| Home mobile (n=3)      | LCP mediana (range)                    | 3.827 ms (3.805–3.874) | **3.207 ms** (3.133–3.208)         | **−620 ms (−16%)** |
| Articolo mobile (n=2)  | LCP (immagine)                         | 3.579 / 3.522 ms       | **3.017 / 3.000 ms**               | **−540 ms (−15%)** |
| Articolo mobile        | Insight `LCPDiscovery` (fetchpriority) | FAILED                 | superato                           | —                  |
| Risultati mobile (n=1) | LCP                                    | 3.690 ms               | **3.066 ms**                       | −624 ms (−17%)     |
| Risultati mobile       | JS trasferito al load                  | 367 KB                 | **208 KB**                         | −43%               |
| Risultati mobile       | Grafici Recharts montati al load       | 19                     | **0** (montati vicino al viewport) | —                  |
| Risultati mobile       | Nodi DOM al load                       | 5.942                  | **4.586**                          | −23%               |
| Risultati mobile       | Forced reflow attribuito a Recharts    | 102 ms                 | **nessuno**                        | —                  |
| Home desktop (n=2)     | CLS                                    | 0,05 / 0,05            | **0,00 / 0,00**                    | risolto            |
| Home desktop           | LCP                                    | 375 ms                 | 380 ms                             | invariato (rumore) |
| Home mobile            | INP "Tabella" / "Menu" (CPU 4×)        | 56–64 ms / —           | **40 ms / 48 ms**                  | migliorato         |
| Articolo mobile        | INP apertura ricerca (chunk lazy)      | —                      | 64 ms                              | ok                 |

In HTTP/1.1 (lab locale originale) l'LCP della home resta ~2,85 s prima e dopo. Lì il limite è la coda delle connessioni, non i byte: per questo il confronto di riferimento è quello in HTTP/2.

### 7.3 Peso delle risorse (gzip -9, prima → dopo)

| Risorsa                                     | Prima                                    | Dopo                             |
| ------------------------------------------- | ---------------------------------------- | -------------------------------- |
| JS home (script iniziali)                   | 397 KB                                   | **236 KB (−40%)**                |
| JS articolo / chi-siamo / contro-formazione | 261–262 KB                               | **218–219 KB (−16%)**            |
| CSS critico                                 | 31 KB (+1 CSS font duplicato in preload) | **26 KB**, duplicato eliminato   |
| Font precaricati                            | 7 file, 123 KB                           | **5 file, 93 KB** (sotto budget) |
| `icon0.svg`                                 | 141 KB                                   | **26 KB**                        |

### 7.4 Verifiche di non regressione

- **Visiva:** screenshot full-page prima/dopo con diff pixel per pixel. Home desktop (1440×6935), articolo desktop (1440×5070), home mobile (721×15143) e chi-siamo mobile (721×3127) hanno **0 pixel diversi** e altezze identiche. Sezione grafico della pagina risultati: stessa altezza (659 px), grafico identico. Favicon rasterizzato a 32/64/180/512 px: differenza media ≤ 1,7/255, solo antialiasing dei bordi.
- **SEO:** `<head>` (title, meta, canonical, OG/Twitter, icone) e JSON-LD **identici** su 7 pagine; `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `feed.xml` e `llms.txt` identici byte per byte.
- **Funzionale:** ricerca nel sub-header (chiamate tRPC `suggestions` + `search`, 10 risultati); menu con le voci reali dopo lo streaming; indice e toggle "Tabella"; grafici che si montano scorrendo.
- **Qualità:** `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (804/804), `fix:tailwind-vars:check`, `prisma validate`, `pnpm build` superati.

### 7.5 Stato per intervento

| ID    | Stato                             | Cosa è stato fatto                                                                                                                                                                                                                                                                                   |
| ----- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-1  | ✅ fatto                          | `charts/lazy-recharts.tsx`: Recharts caricato con `next/dynamic` e **montato solo vicino al viewport** (`IntersectionObserver`, margine 400 px), con placeholder della stessa altezza di `ChartShell`. Il test dei grafici risolve i wrapper lazy con un `vi.mock`                                   |
| P1-2a | ✅ fatto                          | `leaflet.css` e i relativi override spostati da `globals.css` in `components/maps/leaflet.css`. La mappa pubblica lo carica insieme a `import("leaflet")` (`load-leaflet.ts`); i due editor mappa del CMS lo importano staticamente. Ordine leaflet → override verificato nel chunk                  |
| P1-2b | ✅ fatto (sezione 8)              | CSS pubblico separato da quello CMS: −20% di CSS critico                                                                                                                                                                                                                                             |
| P1-3  | ✅ fatto                          | Fallback di `Suspense` = lo stesso `PublicHeader` senza voci di menu: la barra sticky è già nello shell e il contenuto non si sposta. L'opzione B (togliere `connection()`) è **esclusa**: `connection()` serve a non richiedere il DB in build (commit `c98c035`)                                   |
| P2-1  | ✅ fatto                          | Trovata la causa reale: `app/global-error.tsx` ridichiarava Archivo/Spectral con il peso 300, e i suoi preload valevano su tutte le pagine. I font sono ora in `app/fonts.ts`, condivisi da layout e global-error; Spectral 300 è rimosso (nessuna UI renderizzata lo usa: `CmsHairline` non ha usi) |
| P2-2  | ✅ fatto                          | `fetchPriority="high"` sulle cover precaricate (`ArticleCoverImage`) e sull'hero delle lezioni                                                                                                                                                                                                       |
| P2-3  | ✅ fatto                          | `TrpcProvider` rimosso dal layout pubblico. Il sub-header carica la ricerca (con il suo provider, `IssueSearchMenuResults`) via `next/dynamic` con prefetch su hover/focus, come già faceva l'indice della home. Il layout `(questionnaire)` ha già il suo provider                                  |
| P2-4  | ✅ fatto                          | `lib/i18n/public.ts` (solo `public` + `editorial`) usato dai componenti pubblici e dagli error boundary; TypeScript garantisce che nessuno usi `i18n.cms`                                                                                                                                            |
| P2-5  | ✅ fatto, con cambio di approccio | `content-visibility: auto` provato e **scartato**: faceva salire il forced reflow da 97 a 275 ms, perché Recharts misura sezioni saltate e obbliga il browser a impaginarle. Sostituito dal mount vicino al viewport di P1-1                                                                         |
| P2-6  | ✅ fatto                          | PNG incorporato ricampionato da 2421 a 512 px (Lanczos, palette), stessa struttura SVG, stesso percorso                                                                                                                                                                                              |
| P2-7  | ❎ non necessario                 | Verificato: le pagine vengono ripristinate dalla bfcache nonostante `no-store` (stato JS conservato dopo avanti/indietro)                                                                                                                                                                            |
| P3-1  | ⏸ non applicato                   | I 13,9 KB di `LegacyJavaScript` vengono dal runtime di Next, non dal codice del progetto; un `browserslist` più aggressivo cambierebbe i browser supportati (decisione di prodotto)                                                                                                                  |
| P3-2  | ✅ fatto                          | Reading depth: misura al massimo una volta per frame (`requestAnimationFrame`) e stacca i listener quando tutte le milestone sono tracciate                                                                                                                                                          |
| P3-3  | ⏸ non applicato                   | Prefetch RSC doppi: comportamento interno del router di Next 16 (due chiavi `_rsc`). Richieste a bassa priorità dopo il load; nessun impatto misurabile su LCP/INP                                                                                                                                   |
| P3-4  | ❎ non necessario                 | `sizes="221px"` è già presente; `w=640` dipende dalla scala `imageSizes` di Next, trasferimento 4 KB                                                                                                                                                                                                 |
| P3-5  | 📋 da fare fuori dal repo         | Il `Caddyfile` non è versionato. Verificare `encode zstd gzip` sul sito e header `Cache-Control: public, max-age=31536000, immutable` su `/_next/static/*`                                                                                                                                           |

### 7.6 Rischio di deploy emerso durante l'audit (fuori scope performance)

`pnpm build` su `HEAD` **fallisce se il DB non è raggiungibile**: `Export encountered an error on /(public)/page`, dove `getPublicHomeData` lancia un'eccezione in prerender. Il workflow `deploy-production.yml` builda l'immagine senza passare il secret `build_env`, quindi il Dockerfile usa il placeholder `localhost:5432`. Il commit `c98c035` dichiarava "build no longer needs a database", ma la home oggi non chiama `connection()`. Va verificato se l'ultimo deploy in CI è andato a buon fine. Non è stato modificato nulla.

### 7.7 Cosa resta aperto

- ~~P1-2b~~: fatto, vedi sezione 8.
- **Mappe:** nessuna pagina pubblica contiene oggi un blocco mappa e il CMS richiede login. Il caricamento CSS + Leaflet è verificato sulla build (chunk e ordine delle regole), ma va provato a mano su una mappa reale: home con blocco mappa ed editor mappe del CMS.
- **Dati di campo:** misurare LCP/INP/CLS reali dopo il deploy (`web-vitals` → evento Umami), intervento da approvare a parte.

---

## 8. Seconda tornata di ottimizzazioni

### 8.1 Interventi

| Intervento                                | Cosa è stato fatto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CSS pubblico separato dal CMS (P1-2b)** | Il design system (token, base, classi custom) è passato da `app/globals.css` ad `app/site.css`. `app/globals.css` (layout radice, tutte le route) importa Tailwind + `site.css` ed esclude dalla scansione `components/cms`, `features/cms`, `app/(cms)`, `app/(cms-preview)` e `app/(auth)`. `app/cms.css` importa Tailwind + `site.css` con scansione completa ed è caricato da layout CMS, layout preview e pagina di login, **dopo** `globals.css`. Aggiornati `scripts/fix-tailwind-color-vars.mjs` (legge i token da `site.css`), `components.json`, `AGENTS.md` e i riferimenti in `docs/` |
| **Altezza dei placeholder dei grafici**   | Il primo `MountNearViewport` riservava solo l'altezza del grafico: la pagina risultati era 349 px più bassa finché i grafici non venivano montati, con il rischio di salti navigando dall'indice laterale. Il grafico a torta è ora diviso in `BooleanPieGraphic` (Recharts, lazy) e `BooleanPieLegend` (senza Recharts, sempre renderizzata, in `boolean-pie-legend.tsx`). `BooleanPieChart` mantiene markup e API                                                                                                                                                                               |

### 8.2 Perché il CMS non cambia

`app/cms.css` produce **lo stesso file, con lo stesso hash di contenuto (`45235diqkfaju.css`), del vecchio CSS globale**. Nelle pagine CMS è caricato dopo il CSS pubblico. Dentro ogni cascade layer vince l'ultima regola dichiarata, e lì tutte le regole compaiono nello stesso ordine di prima, quindi il risultato è identico a quello precedente. Il costo è circa 21 KB in più, solo nelle pagine del CMS.

### 8.3 Misure (HTTP/2, mobile Slow 4G, CPU 4×, run alternate, stessi dati)

La home contiene ora anche il blocco mappa aggiunto nel CMS, quindi la baseline è stata ricostruita e rimisurata sugli stessi dati.

| Metrica                     | Baseline                   | Branch finale                                      | Delta               |
| --------------------------- | -------------------------- | -------------------------------------------------- | ------------------- |
| LCP home mobile (n=3)       | 3.789 ms (3.773–3.793)     | **3.056 ms** (3.022–3.074)                         | **−733 ms (−19%)**  |
| CSS critico pubblico (gzip) | 26,1 KB + 1,7 KB font-face | **20,9 KB** + 1,4 KB                               | −20%                |
| CSS pagine CMS              | 26,1 KB                    | 20,9 + 26,1 KB                                     | +21 KB (solo admin) |
| CSS Leaflet                 | nel CSS globale            | **caricato solo all'inizializzazione della mappa** | —                   |

### 8.4 Verifiche

- **Equivalenza CSS deterministica.** Per 13 pagine × 2 viewport ho confrontato, elemento per elemento, posizione, dimensioni e circa 50 proprietà calcolate. Tutte le pagine, `/cms/login` compreso, sono identiche. L'unica differenza è un `<link>` nascosto di preload eliminato in P2-1.
  - Gli screenshot full-page di Puppeteer si sono rivelati instabili: un `clamp(…vw…)` ricalcolato durante la cattura, in entrambe le direzioni. Per questo il criterio è diventato il confronto degli stili calcolati.
- **Pagina risultati:** altezza totale e altezza di **tutte le 50 sezioni identiche** alla baseline con 0 grafici montati, su desktop e mobile.
- **Stati interattivi** (banner, menu, ricerca nella home e nel sub-header, indice), desktop e mobile: 0 pixel diversi. Unica eccezione una riga sub-pixel dell'antialiasing del bordo header nel banner mobile, presente in modo variabile anche tra run della stessa build.
- **Mappa reale** (blocco mappa ora presente in home): Leaflet si inizializza, 1 marker e 9 tile caricati. `touch-action: pan-y` e `z-index: 0` dei pane sono identici alla baseline, la resa è identica. Il CSS di Leaflet non c'è al caricamento e arriva con la mappa.
- **Qualità:** lint, typecheck, 804/804 test, `fix:tailwind-vars:check`, prettier, `prisma validate` e build superati.

### 8.5 Verifiche in produzione (`https://middleware.media`, 2026-11-24)

| Voce                                                 | Esito                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dati reali (RUM)                                     | ✅ **Già attivi.** La variabile GitHub `PRODUCTION_UMAMI_PERFORMANCE` vale `true` dal 2026-07-22. In pagina lo script Umami ha `data-performance="true"`, il tracker servito gestisce l'attributo e invia gli eventi a `/api/send`. LCP/INP/CLS reali sono nella scheda **Performance** della dashboard Umami. Nessuna modifica necessaria |
| Protocollo                                           | ✅ HTTP/2, con HTTP/3 annunciato (`alt-svc: h3`)                                                                                                                                                                                                                                                                                           |
| Cache asset statici                                  | ✅ `Cache-Control: public, max-age=31536000, immutable` su `/_next/static/*`                                                                                                                                                                                                                                                               |
| Compressione                                         | ⚠️ **Solo gzip** su HTML e CSS anche quando il browser accetta `zstd`/`br`. Con `encode zstd gzip` nel `Caddyfile` (non versionato, sul VPS) il testo trasferito scenderebbe di un ulteriore ~10–20%. È una modifica alla configurazione del server, non una variabile: richiede accesso SSH al VPS                                        |
| LCP home mobile in produzione (Slow 4G, CPU 4×, n=1) | 3.728 ms. In linea con la baseline locale in HTTP/2 (3.789 ms): il laboratorio locale riproduce bene la produzione, quindi dopo il deploy del branch l'atteso è circa 3,0 s                                                                                                                                                                |

**Prima del deploy del branch:** resta valido il rischio della sezione 7.6. Una build senza DB raggiungibile fallisce in prerender della home, quindi va verificato che la pipeline CI riesca a buildare.

---

## 9. Integrazione su `main` (dopo `4f661ef`)

Nel frattempo `main` ha ricevuto 4 commit con 349 file modificati, tra cui `5111bb9 feat(questionnaires): replace charts and public results page with tables`, che **rimuove Recharts dal progetto**. Le ottimizzazioni sono state quindi riapplicate da zero su `origin/main` (branch `perf/audit-fixes-v2`), file per file:

- 56 file invariati upstream: ripresi così come erano;
- 16 file modificati upstream: modifica rifatta a mano sulla versione nuova;
- 10 file eliminati upstream (grafici): esclusi.

**Superati da `main` e quindi non inclusi:** P1-1 (Recharts lazy), il mount dei grafici vicino al viewport e la divisione torta/legenda. Recharts non esiste più.

**Inclusi nel commit:**

- header nello shell statico (P1-3);
- Leaflet CSS on demand (P1-2a);
- CSS pubblico separato da quello CMS (P1-2b);
- font condivisi senza Spectral 300 (P2-1);
- `fetchPriority` sulle immagini LCP (P2-2);
- ricerca e tRPC lazy (P2-3);
- dizionario i18n pubblico (P2-4);
- favicon leggero (P2-6);
- reading depth throttled (P3-2).

### Misure contro `origin/main` (HTTP/2, mobile Slow 4G, CPU 4×, run alternate)

| Metrica                                 | `main`             | Con le ottimizzazioni         |
| --------------------------------------- | ------------------ | ----------------------------- |
| LCP home mobile (n=2)                   | 3.590 / 3.580 ms   | **2.952 / 2.982 ms (−17%)**   |
| JS iniziale home / articolo / chi-siamo | 277 / 261 / 260 KB | **234 / 218 / 218 KB (−16%)** |
| CSS critico pubblico                    | 30 KB              | **21 KB (−30%)**              |
| Font precaricati                        | 7 file, 123 KB     | **5 file, 93 KB**             |

### Verifiche

- **Equivalenza stili calcolati** (13 pagine × 2 viewport, circa 50 proprietà per elemento): identiche. Restano solo differenze non visive: il `<link>` di preload rimosso, ±1 px sul logo dovuto al tempo di caricamento dell'immagine (in entrambe le direzioni), il route announcer nascosto di Next.
- **Mappa:** stessa resa e stesso comportamento touch; CSS caricato solo all'inizializzazione.
- **Qualità:** lint, typecheck, 822/822 test, `fix:tailwind-vars:check`, `prisma validate` e build superati.

### Deploy e Caddy

Il deploy è manuale via SSH (`scripts/production-deploy-manual.sh`, vedi `docs/production-ops.md`). Il build avviene sulla VPS con un relay verso Postgres, quindi **il rischio "build senza DB" della sezione 7.6 non si applica al deploy reale**: riguarda solo il workflow GitHub Actions, che il runbook indica come non in uso. L'accesso SSH dalla sessione di lavoro è stato negato dai permessi locali: deploy e `encode zstd gzip` su Caddy vanno eseguiti da chi ha accesso, seguendo il runbook.
