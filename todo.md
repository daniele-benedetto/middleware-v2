# TODO - Fase CMS UI (tRPC-only)

Contesto: Next.js 16 (App Router), Better Auth, Prisma, API tRPC unica, DB unico in produzione.

Decisioni gia fissate:

- API backend tRPC-only (`/api/trpc`), nessun residuo REST.
- Ruoli: `ADMIN` gestisce utenti + dominio editoriale, `EDITOR` gestisce solo dominio editoriale.
- Delete policy: hard delete per tutte le risorse.
- Invariante dominio: `publishedAt` solo con `status = PUBLISHED` (gia lato API).
- Slug normalizzato lato API e univocita rispettata lato DB.
- Create/Edit devono avvenire su rotte dedicate per risorsa (no inline CRUD dentro list screen).

## 3) CRUD route-based preparation (senza pagine dedicate per ora)

Obiettivo: preparare tutto il necessario per create/edit su route specifiche, senza creare ancora i file `page.tsx` delle nuove route.

- [x] Definire contratto route target per tutti i moduli:
  - `issues`: `/cms/issues/new`, `/cms/issues/[id]/edit`
  - `categories`: `/cms/categories/new`, `/cms/categories/[id]/edit`
  - `tags`: `/cms/tags/new`, `/cms/tags/[id]/edit`
  - `articles`: `/cms/articles/new`, `/cms/articles/[id]/edit`
  - `users`: `/cms/users/new`, `/cms/users/[id]/edit`
- [x] Preparare layer shared form route-based in `features/cms/shared/forms/*` (submit/cancel, dirty state, error mapping, toast).
- [x] Preparare form screen modulari (create/edit) per `Issue`, `Category`, `Tag`, `Article`, `User` senza wiring pagina.
- [x] Preparare hook dedicati per `create`, `update`, `getById` per ciascun modulo, con invalidazione coerente.
- [x] Preparare mapping UX per errori `CONFLICT` su `issues`, `categories`, `tags`, `users` (articles gia coperto in parte).
- [x] Aggiornare CTA list (`Nuovo`, `Modifica`) per puntare alle route dedicate, mantenendo fallback safe finche le pagine non sono create.

Approccio scelto: prima fondamenta UX/performance (P0/P1), poi CRUD moduli.

## 5) Modulo Issues

Procedure API disponibili: `issues.list`, `issues.getById`, `issues.create`, `issues.update`, `issues.delete`, `issues.reorder`.

- [ ] Implementare create Issue su route dedicata (`/cms/issues/new`) con validazione client coerente a schema.
- [ ] Implementare edit Issue su route dedicata (`/cms/issues/[id]/edit`).
- [ ] Gestire errori conflitto slug (`CONFLICT`) con messaggio specifico.

## 6) Modulo Categories

Procedure API disponibili: `categories.list`, `categories.getById`, `categories.create`, `categories.update`, `categories.delete`.

- [ ] Implementare create Category su route dedicata (`/cms/categories/new`).
- [ ] Implementare edit Category su route dedicata (`/cms/categories/[id]/edit`).
- [ ] Gestire conflitto slug (`CONFLICT`) in UX.

## 7) Modulo Tags

Procedure API disponibili: `tags.list`, `tags.getById`, `tags.create`, `tags.update`, `tags.delete`.

- [ ] Implementare create Tag su route dedicata (`/cms/tags/new`).
- [ ] Implementare edit Tag su route dedicata (`/cms/tags/[id]/edit`).
- [ ] Gestire conflitto slug (`CONFLICT`) in UX.

## 8) Modulo Articles

Procedure API disponibili: `articles.list`, `articles.getById`, `articles.create`, `articles.update`, `articles.delete`, `articles.syncTags`, `articles.publish`, `articles.unpublish`, `articles.archive`, `articles.feature`, `articles.unfeature`, `articles.reorder`.

- [ ] Implementare create Article su route dedicata (`/cms/articles/new`) (campi minimi + campi opzionali media).
- [ ] Implementare edit Article su route dedicata (`/cms/articles/[id]/edit`).
- [ ] Implementare sync tags articolo (`articles.syncTags`) con selector multi-tag.

## 9) Modulo Users (solo ADMIN)

Procedure API disponibili: `users.list`, `users.getById`, `users.create`, `users.update`, `users.updateRole`, `users.delete`.

- [ ] Implementare create User su route dedicata (`/cms/users/new`).
- [ ] Implementare edit User su route dedicata (`/cms/users/[id]/edit`) (campi consentiti).

## Definition of Ready - CMS UI pronto

- [ ] Shell CMS operativa con navigation completa.
- [ ] Fondamenta UX/performance P0 completate e verificate.
- [ ] CRUD completo operativo per `Issue`, `Category`, `Tag`, `Article`, `User`.
- [ ] Baseline quality gates attivi (lint, typecheck, build, controllo performance minimo).
- [ ] Sostituire i fallback OG/Twitter con asset editoriali finali in `public/brand/`:
  - [ ] `og-default-1200x630.png`
  - [ ] `twitter-default-1200x630.png`
