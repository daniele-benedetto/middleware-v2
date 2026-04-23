# TODO - Fase CMS UI (tRPC-only)

Contesto: Next.js 16 (App Router), Better Auth, Prisma, API tRPC unica, DB unico in produzione.

Decisioni gia fissate:

- API backend tRPC-only (`/api/trpc`), nessun residuo REST.
- Ruoli: `ADMIN` gestisce utenti + dominio editoriale, `EDITOR` gestisce solo dominio editoriale.
- Delete policy: hard delete per tutte le risorse.
- Invariante dominio: `publishedAt` solo con `status = PUBLISHED` (gia lato API).
- Slug normalizzato lato API e univocita rispettata lato DB.

## 5) Modulo Issues

Procedure API disponibili: `issues.list`, `issues.getById`, `issues.create`, `issues.update`, `issues.delete`, `issues.reorder`.

- [x] Implementare lista Issues con:
  - [x] filtri: `isActive`, `published`, `q`
  - [x] sort: `createdAt`, `sortOrder`, `publishedAt` + `sortOrder`
  - [x] pagination: `page`, `pageSize`
  - [x] reorder integrato su `sortOrder` (con procedura dedicata `issues.reorder`).
- [ ] Implementare create Issue (form con validazione client coerente a schema).
- [ ] Implementare edit Issue.
- [ ] Implementare delete Issue con conferma hard delete.
- [ ] Gestire errori conflitto slug (`CONFLICT`) con messaggio specifico.

## 6) Modulo Categories

Procedure API disponibili: `categories.list`, `categories.getById`, `categories.create`, `categories.update`, `categories.delete`.

- [x] Implementare lista Categories con:
  - [x] filtri: `isActive`, `q`
  - [x] sort: `createdAt`, `name`, `slug` + `sortOrder`
  - [x] pagination: `page`, `pageSize`
- [ ] Implementare create Category.
- [ ] Implementare edit Category.
- [ ] Implementare delete Category con conferma.
- [ ] Gestire conflitto slug (`CONFLICT`) in UX.

## 7) Modulo Tags

Procedure API disponibili: `tags.list`, `tags.getById`, `tags.create`, `tags.update`, `tags.delete`.

- [x] Implementare lista Tags con:
  - [x] filtri: `isActive`, `q`
  - [x] sort: `createdAt`, `name`, `slug` + `sortOrder`
  - [x] pagination: `page`, `pageSize`
- [ ] Implementare create Tag.
- [ ] Implementare edit Tag.
- [ ] Implementare delete Tag con conferma.
- [ ] Gestire conflitto slug (`CONFLICT`) in UX.

## 8) Modulo Articles

Procedure API disponibili: `articles.list`, `articles.getById`, `articles.create`, `articles.update`, `articles.delete`, `articles.syncTags`, `articles.publish`, `articles.unpublish`, `articles.archive`, `articles.feature`, `articles.unfeature`, `articles.reorder`.

- [x] Implementare lista Articles con:
  - [x] filtri: `status`, `issueId`, `categoryId`, `authorId`, `featured`, `q`
  - [x] sort: `createdAt`, `publishedAt`, `position` + `sortOrder`
  - [x] pagination: `page`, `pageSize`
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
