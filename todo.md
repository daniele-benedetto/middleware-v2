# TODO - CMS v1 Quality Pass

Contesto: Next.js 16 (App Router), Better Auth, Prisma, API tRPC unica, DB unico in produzione.

## Stato corrente

- [x] `issues` portata a uno stato v1 solido
- [x] reorder `issues` attivo solo in condizioni sicure
- [x] lista `issues` riallineata su `sortOrder asc` come baseline naturale del reorder
- [x] `issues` ripulita da `color`
- [x] slug `issue` auto-compilato con modifica manuale on-demand + rigenera
- [x] pagina edit `issue` riorganizzata con gerarchia migliore
- [x] date picker `issue` introdotto con calendar/popup dedicati
- [x] sidebar articoli nella pagina `issue` resa scrollabile e confinata in altezza
- [x] breadcrumb dinamici con skeleton invece di UUID durante il loading
- [x] loading route dedicato per `issues/[id]/edit`
- [x] `articles` riallineata su prefetch opzioni, filtri editoriali e clearing corretto dei campi opzionali
- [x] create articolo con tag end-to-end
- [x] rimossi fallback raw IDs nella lista articoli
- [x] `categories` riallineata al model reale con `isActive` e slug flow piu editoriale
- [x] `tags` riallineato al model reale con `isActive` e slug flow piu editoriale
- [x] `users` riallineato su route layer, self-guard admin e parita create/edit per `image`
- [x] invalidation corretta tra `issues` e `articles`
- [x] bug search URL sync corretto nelle list screen tramite componente condiviso
- [x] fix dei form semplici per distinguere campi svuotati vs non modificati
- [x] pass copy/i18n su titoli form, label, hint, toast e pannelli CMS principali
- [x] refactor shared list hooks per ridurre duplicazione strutturale piu evidente
- [x] rimozione del ramo placeholder `components/cms/pages` / `features/cms/resources`
- [x] ottimizzazioni React 19 / Next16 su navigazione e search debounce (`startTransition`, `useDeferredValue`, `useEffectEvent`)
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm build`

## Checklist qualitativa

- [x] Parita tra Prisma model, schema Zod, service, repository, DTO e schermate CMS
- [x] Nessuna feature backend lasciata senza UI se serve alla v1
- [x] Nessuna ambiguita tra valore non toccato e valore svuotato intenzionalmente
- [x] Router tRPC orchestration-only, logica dominio nel service, accesso dati nel repository
- [x] Nessun dead code, feature flag finto o fallback legacy non necessario
- [x] Nessuna duplicazione importante lasciata senza motivo dopo il refactor finale
- [x] L'architettura del codice e coerente e ben strutturata
- [x] Il codice e ottimizzato e segue le best practices principali di Next16 adottabili qui senza over-engineering
- [x] Verifica finale sempre con `pnpm lint`, `pnpm typecheck`, `pnpm build`
- [x] Nessuna UI che espone flussi troppo tecnici dove serve un controllo editoriale reale nel perimetro attuale, lasciando `audioChunks` fuori scope su richiesta esplicita

## Audit CMS complessivo

- [x] Routing App Router in `app/(cms)` coerente, minimale e allineato alle convenzioni Next 16
- [x] Layout, loading state ed eventuali error state coprono in modo consistente le principali entry del CMS
- [x] Server e Client Component sono separati correttamente, con boundary puliti e senza lavoro client inutile
- [x] Data fetching, cache, invalidation e refresh UX sono coerenti con le best practice Next 16 / React 19 adottabili qui
- [x] Le pagine `page.tsx` del CMS restano sottili e delegano correttamente a screen/feature layer
- [x] I componenti condivisi sono realmente riusabili e non contengono accoppiamenti impliciti a una singola risorsa
- [x] Le schermate lista hanno ricerca, filtri, paginazione, selection, bulk actions e reorder gestiti senza edge case evidenti
- [x] Le schermate form distinguono correttamente create/edit, default values, campi opzionali, clear intenzionale e dirty state
- [x] Validazione client/server, mapping errori e toast coprono errori utente, errori backend e casi limite principali
- [x] Permessi, ruoli, stati forbidden e guardie di navigazione non espongono azioni non autorizzate
- [x] Tutti i testi utente del CMS stanno nel dizionario i18n o in mapping centralizzati, senza copy statica dispersa
- [x] Naming, struttura cartelle, responsabilita dei file e livello di astrazione restano coerenti in tutto il CMS
- [x] Il codice evita duplicazioni strutturali importanti tra resources, hook, toolbar, tabelle e form flows
- [x] Le eccezioni editoriali e di dominio sono gestite con messaggi comprensibili e fallback UX adeguati
- [x] Accessibilita base, responsive behavior e semantica interattiva del CMS sono sufficienti per un uso reale
- [x] Non emergono regressioni ovvie su performance, rendering, navigation transitions o hydration
- [x] Non restano placeholder, dead code, branch tecnici o affordance ancora troppo grezze per un rilascio CMS v1 nel perimetro concordato
- [x] Il CMS e pronto al rilascio considerando UX editoriale, robustezza applicativa e gap operativi residui nel perimetro concordato

### Esito audit attuale

- Verifiche automatiche correnti: `pnpm lint`, `pnpm typecheck`, `pnpm build` tutte verdi.
- Stato generale: il CMS e ora in uno stato di rilascio coerente per il perimetro concordato, con l'unica nota esplicitamente esclusa su `audioChunks`.

### Migliorie completate in questo pass

- Aggiunti boundary CMS dedicati `app/(cms)/cms/error.tsx` e `app/(cms)/cms/not-found.tsx`.
- Le edit route CMS ora trasformano i `NOT_FOUND` tRPC in 404 reali di segmento invece di usare `.catch(() => undefined)`.
- Le route dinamiche CMS trattano ora come `notFound()` sia i `NOT_FOUND` sia i `BAD_REQUEST` coerenti con ID route non validi, tramite helper condiviso `prefetchCmsDetailOrNotFound`.
- Rimossa la route tecnica `cms/error-preview`.
- Rimossi rami non usati `CmsTopbar`, `CmsListToolbar` e `get-dashboard-metrics`.
- Resi semantici i principali form CMS con `<form onSubmit>` e pulsanti submit veri.
- Centralizzata la copy residua del CMS nel dict i18n (`rich-text`, placeholder shared, validazione shared, quick-action errors, aria label editor, label ruolo form utenti).
- Migliorati i dialog di conferma per gestire conferme async senza doppio submit.
- Migliorate le action di reorder con label accessibili e testo bulk piu aderente allo scope reale (`Seleziona visibili`).
- Gestiti meglio due salvataggi parziali reali: `articles` update + sync tag e `users` update + role update.
- Il form `articles` non degrada piu silenziosamente se le query opzioni falliscono: espone errore esplicito e retry.
- Abilitato `authInterrupts` e introdotta `app/(cms)/cms/forbidden.tsx`, con route admin-only migrate a `forbidden()` reale.
- `audioChunks (JSON)` e ora confinato in una sezione tecnica collassabile invece di restare esposto come campo primario del form articolo.
- Il flusso `issues` update + reorder articoli e ora una singola mutation lato server con invalidation piu coerente.
- `categories` e `tags` condividono ora screen generici dedicati per liste e form taxonomy, riducendo la duplicazione strutturale residua.
- La dashboard CMS e stata riallineata a metriche e indicatori reali invece di restare una shell minimale.
- Generati gli asset statici finali `public/brand/og-default-1200x630.png` e `public/brand/twitter-default-1200x630.png` e riallineato il fallback SEO ai file statici.
- Normalizzata la connection string Prisma verso `sslmode=verify-full` quando l'input usa ancora `sslmode=require`, eliminando il warning runtime corrente e rendendo esplicita la semantica SSL.

### Gap residui fuori scope

- `audioChunks (JSON)` resta volutamente fuori scope in questa passata su tua richiesta.

Nota aperta:

- `articles` continua a supportare `audioChunks (JSON)` come controllo tecnico avanzato, ma non e il punto finale ideale lato UX editoriale.

## Prossime attivita reali

### 1. Assets editoriali

- [x] Sostituire i fallback OG/Twitter con asset editoriali finali in `public/brand/`
- [x] `og-default-1200x630.png`
- [x] `twitter-default-1200x630.png`

### 2. Ops / Ambiente

- [x] Verificare e sistemare il warning PostgreSQL SSL mode visto in runtime
- [x] Decidere se fissare esplicitamente `sslmode=verify-full` o configurazione equivalente nella connection string

### 3. Rifinitura post-v1 opzionale

- [ ] Valutare una UX meno tecnica per `audioChunks` negli articoli, se entra nello scope del primo rilascio editoriale
