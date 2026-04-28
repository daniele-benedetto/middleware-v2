# TODO - CMS v1 Quality Pass

Contesto: Next.js 16 (App Router), Better Auth, Prisma, API tRPC unica, DB unico in produzione.

Obiettivo adesso:

- portare tutte le risorse del CMS allo stesso livello raggiunto su `issues`
- rianalizzare ogni flusso end-to-end con priorita a qualita del codice, semplicita e completezza v1
- eliminare codice morto, giri inutili, UI grezze e mismatch tra model, API e schermate CMS

Decisioni gia fissate:

- API backend tRPC-only (`/api/trpc`), nessun residuo REST
- ruoli: `ADMIN` gestisce utenti + dominio editoriale, `EDITOR` gestisce solo dominio editoriale
- delete policy: hard delete per tutte le risorse
- slug normalizzato lato API e univocita rispettata lato DB
- create/edit su rotte dedicate per risorsa, no inline CRUD dentro le list screen

## Stato corrente

- [x] `issues` portata a uno stato v1 molto piu solido
- [x] `articles` riallineata su prefetch opzioni, filtri editoriali e clearing corretto dei campi opzionali
- [x] `categories` riallineata al model reale con `isActive` e slug flow piu editoriale
- [x] `tags` riallineato al model reale con `isActive` e slug flow piu editoriale
- [x] reorder `issues` con UI reale in lista
- [x] reorder `articles` messo in sicurezza lato server e riallineato lato UI
- [x] invalidation corretta tra `issues` e `articles`
- [x] bug search URL sync corretto nelle list screen tramite componente condiviso
- [x] fix dei form semplici per distinguere campi svuotati vs non modificati
- [x] cleanup iniziale dei pezzi non piu usati dopo il refactor
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm build`

## Roadmap v1 - Ordine consigliato

### 1. Articles - quality pass completo

- [x] Rianalizzare tutto il flusso `articles`:
- [x] `app/(cms)/cms/articles/*`
- [x] `features/cms/articles/*`
- [x] `lib/server/modules/articles/*`
- [x] Verificare lista/create/edit contro il model reale, senza assumere che il lavoro corrente sia gia definitivo
- [x] Migliorare tutte le UX ancora grezze in v1
- [x] Sostituire i punti dove si lavora ancora con input troppo tecnici o poco editoriali
- [x] Rivedere filtri e toolbar della lista con focus su usabilita reale
- [x] Verificare publish/unpublish/archive/feature/reorder come feature complete e coerenti
- [x] Verificare optimistic updates, invalidation e prefetch opzioni
- [x] Rimuovere codice morto, branch inutili o astrazioni nate troppo presto

### 2. Categories - portare alla stessa barra di issues

- [x] Rianalizzare `categories` end-to-end
- [x] Allineare form/schema/UI al model reale, incluso `isActive`
- [x] Verificare che lista, create, edit e delete coprano davvero la risorsa senza gap
- [x] Pulire semplificazioni forzate o fallback non necessari
- [x] Ripassare error handling, copy e invalidation
- [x] Rimuovere codice non piu utile dopo il quality pass

### 3. Tags - portare alla stessa barra di issues

- [x] Rianalizzare `tags` end-to-end
- [x] Allineare form/schema/UI al model reale, incluso `isActive`
- [x] Verificare che lista, create, edit e delete coprano davvero la risorsa senza gap
- [x] Pulire semplificazioni forzate o fallback non necessari
- [x] Ripassare error handling, copy e invalidation
- [x] Rimuovere codice non piu utile dopo il quality pass

### 4. Users - quality pass admin-only

- [ ] Rianalizzare `users` end-to-end
- [ ] Verificare create/edit/list con focus su ruolo, image, guard admin-only e invalidation
- [ ] Rendere il flusso coerente con il resto del CMS, ma senza sovra-astrarre se non serve
- [ ] Ripassare bulk actions e quick actions lato UX e robustezza
- [ ] Pulire codice ridondante o workaround ormai superati

### 5. Shared CMS cleanup dopo i pass per-risorsa

- [ ] Riesaminare `app/(cms)` nel complesso dopo il pass su tutte le risorse
- [ ] Estrarre solo le astrazioni che restano davvero stabili dopo i refactor per-risorsa
- [ ] Evitare mini-framework interni: preferire helper piccoli e chiari
- [ ] Uniformare pattern di loading, prefetch, invalidation, metadata e copy
- [ ] Eliminare helper/componenti/shared hook non piu referenziati
- [ ] Fare una passata finale per ridurre file troppo verbosi o con troppe responsabilita

## Checklist di qualita da applicare a ogni risorsa

- [ ] Parita tra Prisma model, schema Zod, service, repository, DTO e schermate CMS
- [ ] Nessuna feature backend lasciata senza UI se serve alla v1
- [ ] Nessuna UI che espone raw IDs o flussi tecnici quando serve un controllo editoriale reale
- [ ] Nessuna ambiguita tra valore non toccato e valore svuotato intenzionalmente
- [ ] Router tRPC orchestration-only, logica dominio nel service, accesso dati nel repository
- [ ] Nessun dead code, feature flag finto o fallback legacy non necessario
- [ ] Nessuna duplicazione importante lasciata senza motivo dopo il refactor finale
- [ ] Verifica finale sempre con `pnpm lint`, `pnpm typecheck`, `pnpm build`

## UI / Copy / i18n

- [ ] Ripassare tutti i titoli hardcoded dei form e le copy di azione per portarli in un assetto coerente
- [ ] Uniformare naming e microcopy tra list, form, confirm dialog e toast
- [ ] Verificare che la terminologia editoriale sia consistente in tutto il CMS

## Assets editoriali

- [ ] Sostituire i fallback OG/Twitter con asset editoriali finali in `public/brand/`
- [ ] `og-default-1200x630.png`
- [ ] `twitter-default-1200x630.png`

## Ops / Ambiente

- [ ] Verificare e sistemare il warning PostgreSQL SSL mode visto in runtime
- [ ] Decidere se fissare esplicitamente `sslmode=verify-full` o configurazione equivalente nella connection string
