# TODO - Fase CMS UI (tRPC-only)

Contesto: Next.js 16 (App Router), Better Auth, Prisma, API tRPC unica, DB unico in produzione.

Decisioni gia fissate:

- API backend tRPC-only (`/api/trpc`), nessun residuo REST.
- Ruoli: `ADMIN` gestisce utenti + dominio editoriale, `EDITOR` gestisce solo dominio editoriale.
- Delete policy: hard delete per tutte le risorse.
- Invariante dominio: `publishedAt` solo con `status = PUBLISHED` (gia lato API).
- Slug normalizzato lato API e univocita rispettata lato DB.

## Stato completato

- [x] Audit architettura CMS (2.5) completato.
- [x] Audit UI vs Style Guide (2.6) completato.
- [x] Refactor milestone A/B/C + U1/U2/U3 completati.
- [x] Report e checklist pubblicati:
  - [x] `docs/cms-architecture-audit.md`
  - [x] `docs/cms-ui-audit.md`
  - [x] `docs/cms-smoke-checklist.md`

## 2.7) UI systematization e componenti riusabili

- [ ] Estrarre stile tipografico ripetuto in primitive riusabili:
  - [x] `CmsEyebrow` (label mono uppercase accent)
  - [x] `CmsHeading` (display/title per livelli)
  - [x] `CmsBodyText` (corpo/editorial + varianti muted)
  - [x] sostituire i blocchi tipografici duplicati nelle pagine CMS.
- [ ] Estrarre pattern layout ricorrenti in componenti shared:
  - [x] `CmsSectionSurface` (implementato come `CmsSurface`) (border/background/padding standard).
  - [x] `CmsSectionDivider` (linee 1px/3px) con varianti semantiche.
  - [x] `CmsStatRow`/`CmsMetaRow` per righe metadati ripetute.
- [ ] Consolidare varianti action/form già introdotte:
  - [x] usare `lib/cms/ui/variants.ts` in tutte le azioni CMS.
  - [ ] estendere a select/textarea reali appena entrano nei CRUD.
- [ ] Definire guardrail anti-duplicazione:
  - [x] lint/checklist PR: no nuove classi tipografiche duplicate senza primitive.
  - [x] linee guida in `docs/cms-ui.md` con tabella "quando usare primitive vs inline class".

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
