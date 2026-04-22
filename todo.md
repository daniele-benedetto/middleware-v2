# TODO - Fase CMS UI (tRPC-only)

Contesto: Next.js 16 (App Router), Better Auth, Prisma, API tRPC unica, DB unico in produzione.

Decisioni gia fissate:

- API backend tRPC-only (`/api/trpc`), nessun residuo REST.
- Ruoli: `ADMIN` gestisce utenti + dominio editoriale, `EDITOR` gestisce solo dominio editoriale.
- Delete policy: hard delete per tutte le risorse.
- Invariante dominio: `publishedAt` solo con `status = PUBLISHED` (gia lato API).
- Slug normalizzato lato API e univocita rispettata lato DB.

## 0) Design system e regole UI centralizzate (prima di sviluppare)

Vincoli visivi approvati (source of truth):

- [ ] Applicare palette fissa a 5 token (senza gradienti):
  - [ ] `--bg-main: #F0E8D8`
  - [ ] `--bg-hover: #E5D9C5`
  - [ ] `--ink: #0A0A0A`
  - [ ] `--accent: #C8001A`
  - [ ] `--white: #FFFFFF`
- [ ] Applicare varianti alpha ufficiali del nero (no grigi intermedi):
  - [ ] `ink-60: rgba(10,10,10,0.6)`
  - [ ] `ink-50: rgba(10,10,10,0.5)`
  - [ ] `ink-30: rgba(10,10,10,0.3)`
- [ ] Impostare tipografia con ruoli fissi:
  - [ ] `Archivo Black` per titoli/CTA/sezioni (uppercase, tracking negativo dedicato)
  - [ ] `Newsreader` per contenuti editoriali lunghi
  - [ ] `IBM Plex Mono` per metadati/UI label/categorie
- [ ] Impostare regole hard su superfici:
  - [ ] `border-radius: 0` ovunque
  - [ ] `box-shadow: none` ovunque
  - [ ] nessun effetto decorativo gratuito
- [ ] Standardizzare filetti:
  - [ ] `3px solid #0A0A0A` separatori principali
  - [ ] `1px solid #0A0A0A` griglie interne/card
  - [ ] `4px solid #C8001A` accenti semantici
  - [ ] barra lettura articolo fissa `3px` rossa
- [ ] Impostare text selection globale: `background #C8001A`, `color #FFFFFF`.
- [ ] Applicare scala spacing ufficiale: `4, 8, 12, 16, 20, 24, 32, 48, 72`.
- [ ] Applicare regole di griglia editoriale asimmetrica (home, listing, articolo, esplora, cover).
- [ ] Definire breakpoint operativo: sotto `768px` collasso a colonna singola (cover in 2 colonne).
- [ ] Definire principio guida di UI review: ogni elemento deve avere funzione informativa/operativa.

- [ ] Definire direzione visiva CMS (moodboard breve + principi: sobrio editoriale, leggibilita alta, gerarchia chiara).
- [ ] Definire palette centralizzata (semantic colors):
  - [ ] `background`, `foreground`, `muted`, `border`, `ring`
  - [ ] `primary`, `secondary`, `accent`, `destructive`, `success`, `warning`
  - [ ] stati tabella/card (hover, selected, disabled)
- [ ] Definire tipografia centralizzata:
  - [ ] font family titoli/testo/codice
  - [ ] scala font-size (`xs` -> `2xl`) e line-height
  - [ ] pesi tipografici standard (regular/medium/semibold)
- [ ] Definire scala spaziature e raggi (`spacing`, `radius`) e regole di composizione layout.
- [ ] Definire ombre/elevation e regole uso superfici (card, panel, modal, popover).
- [ ] Definire set icone unico e regole naming/uso.
- [ ] Definire regole motion:
  - [ ] durate/transizioni standard
  - [ ] riduzione motion per accessibilita (`prefers-reduced-motion`)
- [ ] Definire griglia e breakpoints responsive per CMS (desktop-first + tablet/mobile fallback).
- [ ] Definire standard accessibilita minimi UI (focus visibile, contrasto, aria labels, keyboard nav).
- [ ] Definire policy tema:
  - [ ] decidere se supportare dark mode ora o posticipare
  - [x] se posticipata, esplicitare solo tema light ufficiale

Regola componenti (obbligatoria):

- [ ] Prima di creare componenti custom, verificare sempre se esiste un componente `shadcn/ui` adatto.
- [ ] Usare `shadcn/ui` come base primaria per componenti atomici/compositi.
- [ ] Consentire componenti custom solo quando:
  - [ ] il componente non esiste in `shadcn/ui`, oppure
  - [ ] servono varianti dominio-specifiche non ottenibili con composition pulita.
- [ ] Documentare in PR la motivazione quando si introduce un componente custom al posto di `shadcn/ui`.

Governance componenti:

- [ ] Definire cartelle UI condivise (`components/ui` per shadcn, `components/cms` per composition dominio).
- [ ] Definire convenzione props (`variant`, `size`, `state`) coerente su componenti shared.
- [ ] Definire pattern form standard (field wrapper, error message, help text, submit state).
- [ ] Definire pattern table/list standard (toolbar, filtri, sort header, row actions, bulk actions se servono).
- [ ] Definire checklist “UI done” per ogni pagina (loading/empty/error/success/a11y/responsive).

Output richiesti della fase 0:

- [ ] Guida stile sintetica in `README.md` (o file dedicato `docs/cms-ui.md`).
- [ ] Token CSS/Tailwind applicati globalmente (`app/globals.css` + variabili).
- [ ] Libreria base componenti CMS pronta (layout primitives + form primitives + table primitives).

## 1) Fondazioni frontend CMS

- [ ] Definire struttura cartelle CMS (`app/(cms)/*`, `components/cms/*`, `lib/cms/*`) con responsabilita chiare.
- [ ] Definire shell CMS: layout, sidebar, topbar, breadcrumb, area contenuto.
- [ ] Definire navigation map iniziale:
  - [ ] Dashboard
  - [ ] Issues
  - [ ] Categories
  - [ ] Tags
  - [ ] Articles
  - [ ] Users (solo ADMIN)
- [ ] Definire standard UI comuni: tabella, toolbar filtri, pagination footer, modale conferma delete, empty state, loading state.
- [ ] Definire design tokens/base styles CMS coerenti con il progetto.

## 2) Auth, sessione e autorizzazioni UI

- [ ] Implementare guard route-level per accesso CMS autenticato.
- [ ] Implementare gate ruolo `ADMIN` per sezione Users.
- [ ] Implementare fallback UI per `FORBIDDEN` (pagina/section lock).
- [ ] Implementare redirect robusto su sessione assente/scaduta.
- [ ] Mostrare indicatori ruolo in UI (es. badge in header) per contesto operativo.

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
