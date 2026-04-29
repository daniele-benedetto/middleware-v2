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
- [ ] Nessuna UI che espone flussi troppo tecnici dove serve un controllo editoriale reale

Nota aperta su quest'ultimo punto:

- `articles` espone ancora `audioChunks (JSON)` come controllo tecnico minimale; per la v1 puo restare cosi, ma non e il punto finale ideale lato UX editoriale.

## Prossime attivita reali

### 1. Assets editoriali

- [ ] Sostituire i fallback OG/Twitter con asset editoriali finali in `public/brand/`
- [ ] `og-default-1200x630.png`
- [ ] `twitter-default-1200x630.png`

### 2. Ops / Ambiente

- [ ] Verificare e sistemare il warning PostgreSQL SSL mode visto in runtime
- [ ] Decidere se fissare esplicitamente `sslmode=verify-full` o configurazione equivalente nella connection string

### 3. Rifinitura post-v1 opzionale

- [ ] Valutare una UX meno tecnica per `audioChunks` negli articoli, se entra nello scope del primo rilascio editoriale
