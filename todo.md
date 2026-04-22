# TODO - Fase CMS UI (tRPC-only)

Contesto: Next.js 16 (App Router), Better Auth, Prisma, API tRPC unica, DB unico in produzione.

Decisioni gia fissate:

- API backend tRPC-only (`/api/trpc`), nessun residuo REST.
- Ruoli: `ADMIN` gestisce utenti + dominio editoriale, `EDITOR` gestisce solo dominio editoriale.
- Delete policy: hard delete per tutte le risorse.
- Invariante dominio: `publishedAt` solo con `status = PUBLISHED` (gia lato API).
- Slug normalizzato lato API e univocita rispettata lato DB.

## 2.8) Deep UI Refactor vs Style Guide (componente per componente)

Riferimento unico: `docs/Middleware Style Guide.html`

Approccio: prima catalogo completo dei componenti presenti nella style guide, poi refactor incrementale per singolo componente/aspetto con verifica puntuale.

Checklist componenti da implementare/refactorare (ordine consigliato):

- [ ] Fondazioni/layout: masthead, palette+alpha, filetti, scale spacing, griglie, footer
- [ ] Typography set: Archivo/Newsreader/IBM Plex mono specimens
- [ ] Editorial blocks: article card, cover story block, CTA/link inline, manifesto, audio player, cover system
- [ ] Form controls: input (5 stati), textarea, select (3 stati), checkbox (4 stati), radio (3 stati), toggle (3 stati)
- [ ] Tags/badges/buttons: category badge, removable tag, status badge, button sets/sizes
- [ ] Search and form composites: search default+results, full subscription form
- [ ] Navigation/feedback helpers: pagination strip, stepper strip, toast set, tooltip set
- [ ] Voice & tone blocks: rule-grid content components

Riferimento puntuale per il dettaglio completo: `docs/style-guide-component-catalog.md`

### Step 1 - Fondazioni visuali globali

- [ ] Verifica e allineamento finale di palette/alpha/filetti/spacing/global type scale in `app/globals.css`.
- [ ] Aggiungere token mancanti richiesti dalla style guide aggiornata.
- [ ] Freeze regole fondazionali (nessuna classe raw fuori token dove evitabile).

### Step 2 - Tipografia (sistema completo)

- [ ] Allineare primitive tipografiche a tutti i casi della style guide (display, heading, body, meta, note, quote, hairline).
- [ ] Introdurre eventuali primitive mancanti (es. `CmsMetaText`, `CmsQuote`, `CmsNote`).
- [ ] Refactor totale dei testi CMS per usare primitive e non classi duplicate inline.

### Step 3 - Form & input system (blocco prioritario)

- [x] `TextInput` parity completa (default/focus/filled/error/disabled).
- [ ] `Textarea` parity completa (label/helper/counter/stati).
- [ ] `Select/Dropdown` parity completa (trigger/selected/open/item attivo).
- [ ] `Checkbox` parity completa.
- [ ] `Radio` parity completa.
- [ ] Uniformare messaggistica errore/hint con pattern style guide.

### Step 4 - Core CMS building blocks

- [ ] Card system (default/hover/accent editorial variants).
- [ ] CTA system (outline, accent, inline-link editorial).
- [ ] Table/list shell (header row, metadata rows, hover, separators).
- [ ] Empty/loading/error/forbidden states allineati al linguaggio visivo guida.
- [ ] Toolbar/pagination/metarow/breadcrumb/topbar/sidebar parity.

### Step 5 - Componenti editoriali avanzati dalla style guide

- [ ] Cover system (varianti copertina, regole costanti, metadata, tagline).
- [ ] Manifesto block.
- [ ] Audio player.
- [ ] Altri componenti presenti nella style guide aggiornata e non ancora implementati.

### Step 6 - Governance e quality gate per componente

- [ ] Per ogni componente refactorato: checklist parity compilata in PR.
- [ ] Aggiungere mini matrice "component -> stato implementazione" nel catalogo.
- [ ] Aggiornare `docs/cms-ui.md` con API/usage di ogni primitive nuova.
- [ ] Nessuna chiusura step senza `pnpm lint`, `pnpm typecheck`, `pnpm build` verdi.

## 3) Integrazione tRPC client lato UI

- [ ] Definire query key strategy per domini (`users`, `issues`, `categories`, `tags`, `articles`).
- [ ] Definire invalidation policy post-mutation per ogni procedura.
- [ ] Definire helper shared per mapping errori tRPC -> messaggi UI.
- [ ] Definire helper shared per parsing filtri/sort/pagination da URL search params.
- [ ] Definire pattern unificato di hook per list page:
  - [ ] input `{ page, pageSize, query }`
  - [ ] output `{ items, pagination }`
- [ ] Gestire stati errore `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `NOT_FOUND`, `TOO_MANY_REQUESTS`, `BAD_REQUEST`.

## 4) Dashboard CMS

- [ ] Implementare pagina dashboard iniziale con quick links alle sezioni.
- [ ] Aggiungere blocco stato editoriale (conteggi base da liste paginabili o query dedicate se introdotte).
- [ ] Aggiungere blocco attivita recente (placeholder realistico se non presente sorgente audit query).

## 5) Modulo Issues

Procedure API disponibili: `issues.list`, `issues.getById`, `issues.create`, `issues.update`, `issues.delete`.

- [ ] Implementare lista Issues con:
  - [ ] filtri: `isActive`, `published`, `q`
  - [ ] sort: `createdAt`, `sortOrder`, `publishedAt` + `sortOrder`
  - [ ] pagination: `page`, `pageSize`
- [ ] Implementare create Issue (form con validazione client coerente a schema).
- [ ] Implementare edit Issue.
- [ ] Implementare delete Issue con conferma hard delete.
- [ ] Gestire errori conflitto slug (`CONFLICT`) con messaggio specifico.

## 6) Modulo Categories

Procedure API disponibili: `categories.list`, `categories.getById`, `categories.create`, `categories.update`, `categories.delete`.

- [ ] Implementare lista Categories con:
  - [ ] filtri: `isActive`, `q`
  - [ ] sort: `createdAt`, `name`, `slug` + `sortOrder`
  - [ ] pagination: `page`, `pageSize`
- [ ] Implementare create Category.
- [ ] Implementare edit Category.
- [ ] Implementare delete Category con conferma.
- [ ] Gestire conflitto slug (`CONFLICT`) in UX.

## 7) Modulo Tags

Procedure API disponibili: `tags.list`, `tags.getById`, `tags.create`, `tags.update`, `tags.delete`.

- [ ] Implementare lista Tags con:
  - [ ] filtri: `isActive`, `q`
  - [ ] sort: `createdAt`, `name`, `slug` + `sortOrder`
  - [ ] pagination: `page`, `pageSize`
- [ ] Implementare create Tag.
- [ ] Implementare edit Tag.
- [ ] Implementare delete Tag con conferma.
- [ ] Gestire conflitto slug (`CONFLICT`) in UX.

## 8) Modulo Articles

Procedure API disponibili: `articles.list`, `articles.getById`, `articles.create`, `articles.update`, `articles.delete`, `articles.syncTags`, `articles.publish`, `articles.unpublish`, `articles.archive`, `articles.feature`, `articles.unfeature`, `articles.reorder`.

- [ ] Implementare lista Articles con:
  - [ ] filtri: `status`, `issueId`, `categoryId`, `authorId`, `featured`, `q`
  - [ ] sort: `createdAt`, `publishedAt`, `position` + `sortOrder`
  - [ ] pagination: `page`, `pageSize`
- [ ] Implementare create Article (campi minimi + campi opzionali media).
- [ ] Implementare edit Article.
- [ ] Implementare delete Article con conferma.
- [ ] Implementare sync tags articolo (`articles.syncTags`) con selector multi-tag.
- [ ] Implementare azioni editoriali rapide da lista/dettaglio:
  - [ ] publish
  - [ ] unpublish
  - [ ] archive
  - [ ] feature
  - [ ] unfeature
- [ ] Implementare reorder articoli per issue (UI drag-and-drop o controllo posizionale equivalente).
- [ ] Gestire errori dominio in UX:
  - [ ] conflitto slug per issue (`CONFLICT`)
  - [ ] validazione payload (`BAD_REQUEST`)
  - [ ] rate limit su azioni critiche (`TOO_MANY_REQUESTS`)

## 9) Modulo Users (solo ADMIN)

Procedure API disponibili: `users.list`, `users.getById`, `users.create`, `users.update`, `users.updateRole`, `users.delete`.

- [ ] Implementare lista Users con:
  - [ ] filtri: `role`, `q`
  - [ ] sort: `createdAt`, `email` + `sortOrder`
  - [ ] pagination: `page`, `pageSize`
- [ ] Implementare create User.
- [ ] Implementare edit User (campi consentiti).
- [ ] Implementare update role (`users.updateRole`) con UX chiara e conferma.
- [ ] Implementare delete User con conferma.
- [ ] Bloccare completamente accesso UI Users per `EDITOR`.

## 10) Stato UI, UX e resilienza

- [ ] Uniformare pattern loading/skeleton su tutte le pagine CMS.
- [ ] Uniformare empty states con CTA contestuali.
- [ ] Uniformare error states con retry action.
- [ ] Gestire optimistic update dove utile e sicuro (feature/unfeature, publish/unpublish).
- [ ] Gestire debounce su ricerca `q` nelle liste.
- [ ] Persistenza filtri/sort/pagination in URL.

## 11) Testing CMS frontend

- [ ] Definire smoke checklist manuale completa per ogni modulo CMS.
- [ ] Verificare permessi ruolo end-to-end in UI (`ADMIN` vs `EDITOR`).
- [ ] Verificare flussi critici articoli (publish/unpublish/archive/reorder).
- [ ] Verificare gestione errori reali da API tRPC (conflitto, bad request, rate limit).
- [ ] Verificare responsive minimo desktop/tablet/mobile.

## 12) Documentazione frontend CMS

- [ ] Aggiornare `README.md` con architettura cartelle CMS UI.
- [ ] Documentare mappa pagine CMS e responsabilita componenti principali.
- [ ] Documentare contratto query params usato dalla UI per liste.
- [ ] Documentare linee guida UX error handling e permission handling.

## Definition of Ready - CMS UI pronto

- [ ] Shell CMS operativa con navigation completa.
- [ ] CRUD completo operativo per `Issue`, `Category`, `Tag`, `Article`, `User`.
- [ ] Azioni editoriali (`publish/unpublish/archive/feature/unfeature/reorder`) operative da UI.
- [ ] Permessi ruolo rispettati in tutte le sezioni (Users ADMIN-only).
- [ ] Filtri/sort/pagination funzionanti e persistenti in URL su tutte le liste.
- [ ] Error handling coerente e comprensibile per utente editoriale.
- [ ] Build/lint/typecheck verdi.
