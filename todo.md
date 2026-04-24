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
- [x] Implementare delete Issue con conferma hard delete.
- [ ] Gestire errori conflitto slug (`CONFLICT`) con messaggio specifico.
- [x] Implementare azioni rapide lista/dettaglio (single + bulk):
  - [x] delete single con conferma.
  - [x] delete bulk con selezione multipla + conferma.
  - [x] barra azioni bulk con contatore selezione.

## 6) Modulo Categories

Procedure API disponibili: `categories.list`, `categories.getById`, `categories.create`, `categories.update`, `categories.delete`.

- [x] Implementare lista Categories con:
  - [x] filtri: `isActive`, `q`
  - [x] sort: `createdAt`, `name`, `slug` + `sortOrder`
  - [x] pagination: `page`, `pageSize`
- [ ] Implementare create Category.
- [ ] Implementare edit Category.
- [x] Implementare delete Category con conferma.
- [ ] Gestire conflitto slug (`CONFLICT`) in UX.
- [x] Implementare azioni rapide lista/dettaglio (single + bulk):
  - [x] delete single con conferma.
  - [x] delete bulk con selezione multipla + conferma.
  - [x] barra azioni bulk con contatore selezione.

## 7) Modulo Tags

Procedure API disponibili: `tags.list`, `tags.getById`, `tags.create`, `tags.update`, `tags.delete`.

- [x] Implementare lista Tags con:
  - [x] filtri: `isActive`, `q`
  - [x] sort: `createdAt`, `name`, `slug` + `sortOrder`
  - [x] pagination: `page`, `pageSize`
- [ ] Implementare create Tag.
- [ ] Implementare edit Tag.
- [x] Implementare delete Tag con conferma.
- [ ] Gestire conflitto slug (`CONFLICT`) in UX.
- [x] Implementare azioni rapide lista/dettaglio (single + bulk):
  - [x] delete single con conferma.
  - [x] delete bulk con selezione multipla + conferma.
  - [x] barra azioni bulk con contatore selezione.

## 8) Modulo Articles

Procedure API disponibili: `articles.list`, `articles.getById`, `articles.create`, `articles.update`, `articles.delete`, `articles.syncTags`, `articles.publish`, `articles.unpublish`, `articles.archive`, `articles.feature`, `articles.unfeature`, `articles.reorder`.

- [x] Implementare lista Articles con:
  - [x] filtri: `status`, `issueId`, `categoryId`, `authorId`, `featured`, `q`
  - [x] sort: `createdAt`, `publishedAt`, `position` + `sortOrder`
  - [x] pagination: `page`, `pageSize`
- [ ] Implementare create Article (campi minimi + campi opzionali media).
- [ ] Implementare edit Article.
- [x] Implementare delete Article con conferma.
- [ ] Implementare sync tags articolo (`articles.syncTags`) con selector multi-tag.
- [x] Implementare azioni editoriali rapide da lista/dettaglio:
  - [x] publish
  - [x] unpublish
  - [x] archive
  - [x] feature
  - [x] unfeature
  - [x] supporto single + bulk per azioni editoriali (dove semanticamente valido).
- [x] Implementare reorder articoli per issue (UI drag-and-drop o controllo posizionale equivalente).
- [x] Gestire errori dominio in UX:
  - [x] conflitto slug per issue (`CONFLICT`)
  - [x] validazione payload (`BAD_REQUEST`)
  - [x] rate limit su azioni critiche (`TOO_MANY_REQUESTS`)

## 9) Modulo Users (solo ADMIN)

Procedure API disponibili: `users.list`, `users.getById`, `users.create`, `users.update`, `users.updateRole`, `users.delete`.

- [x] Implementare lista Users con:
  - [x] filtri: `role`, `q`
  - [x] sort: `createdAt`, `email` + `sortOrder`
  - [x] pagination: `page`, `pageSize`
- [ ] Implementare create User.
- [ ] Implementare edit User (campi consentiti).
- [x] Implementare update role (`users.updateRole`) con UX chiara e conferma.
- [x] Implementare delete User con conferma.
- [x] Bloccare completamente accesso UI Users per `EDITOR`.
- [x] Implementare azioni rapide lista (single + bulk admin-only):
  - [x] update role single.
  - [x] update role bulk.
  - [x] delete single e bulk con conferma forte.

## 10) Stato UI, UX e resilienza

- [x] Uniformare pattern loading/skeleton su tutte le pagine CMS (liste attive).
- [x] Uniformare empty states con CTA contestuali (liste attive).
- [x] Uniformare error states con retry action (liste attive).
- [x] Gestire optimistic update dove utile e sicuro (feature/unfeature, publish/unpublish).
- [x] Gestire debounce su ricerca `q` nelle liste.
- [x] Persistenza filtri/sort/pagination in URL.

### 10.1) Framework azioni rapide (globale)

- [x] Definire action model condiviso per tutte le risorse:
  - [x] `id`, `label`, `scope` (`single`/`bulk`/`both`).
  - [x] `requiresConfirm`, copy conferma, regole `isVisible`/`isEnabled`.
  - [x] mapping centralizzato errori per azioni rapide (single/bulk).
- [x] Implementare gestione selezione multipla condivisa:
  - [x] checkbox riga + select-all pagina.
  - [x] reset selezione su cambio filtri/sort/pagina.
  - [x] stato selezione centralizzato riusabile per modulo.
- [x] Implementare `BulkActionBar` condivisa:
  - [x] contatore selezionati.
  - [x] CTA dinamiche per modulo/ruolo.
  - [x] conferma azioni distruttive.
- [x] Definire policy di esecuzione bulk:
  - [x] endpoint bulk dedicato dove presente; fallback orchestrato client dove assente.
  - [x] report esito (successi/fallimenti parziali) con toast coerenti.
  - [x] invalidation query centralizzata post-azione.
- [x] Definire pattern reorder come "mode" dedicato (non azione bulk generica).

## 11) Testing CMS frontend

- [x] Definire smoke checklist manuale completa per ogni modulo CMS.
- [x] Verificare permessi ruolo end-to-end in UI (`ADMIN` vs `EDITOR`).
- [x] Verificare flussi critici articoli (publish/unpublish/archive/reorder).
- [x] Verificare gestione errori reali da API tRPC (conflitto, bad request, rate limit).
- [x] Verificare responsive minimo desktop/tablet/mobile.

## 12) Documentazione frontend CMS

- [x] Aggiornare `README.md` con architettura cartelle CMS UI.
- [x] Documentare mappa pagine CMS e responsabilita componenti principali.
- [x] Documentare contratto query params usato dalla UI per liste.
- [x] Documentare linee guida UX error handling e permission handling.

## Definition of Ready - CMS UI pronto

- [ ] Shell CMS operativa con navigation completa.
- [ ] CRUD completo operativo per `Issue`, `Category`, `Tag`, `Article`, `User`.
- [x] Azioni editoriali (`publish/unpublish/archive/feature/unfeature/reorder`) operative da UI.
- [x] Permessi ruolo rispettati in tutte le sezioni (Users ADMIN-only).
- [x] Filtri/sort/pagination funzionanti e persistenti in URL su tutte le liste.
- [x] Error handling coerente e comprensibile per utente editoriale.
- [x] Build/lint/typecheck verdi.
