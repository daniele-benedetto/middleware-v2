# TODO - Fase CMS UI (tRPC-only)

Contesto: Next.js 16 (App Router), Better Auth, Prisma, API tRPC unica, DB unico in produzione.

Decisioni gia fissate:

- API backend tRPC-only (`/api/trpc`), nessun residuo REST.
- Ruoli: `ADMIN` gestisce utenti + dominio editoriale, `EDITOR` gestisce solo dominio editoriale.
- Delete policy: hard delete per tutte le risorse.
- Invariante dominio: `publishedAt` solo con `status = PUBLISHED` (gia lato API).
- Slug normalizzato lato API e univocita rispettata lato DB.

Approccio scelto: prima fondamenta UX/performance (P0/P1), poi CRUD moduli.

## 2) Advanced Next 16 (P2, dopo benchmark)

Obiettivo: abilitare ottimizzazioni avanzate solo dopo aver consolidato P0/P1.

- [ ] Valutare adozione `cacheComponents` in `next.config.ts` con piano di migrazione controllato.
- [ ] Dove appropriato, applicare `"use cache"` + `cacheLife` a funzioni/componenti server idonei.
- [ ] Inserire boundary `Suspense` piu granulari su sezioni lente per streaming progressivo.
- [ ] Valutare `unstable_instant` sui segmenti critici di navigazione (solo se `cacheComponents` attivo).
- [ ] Valutare tuning `experimental.staleTimes` (solo se necessario e con misure).

## 4) Accessibilita e robustezza UX

- [ ] Pass accessibilita su navigazione, dialog, focus management, keyboard interactions.
- [ ] Verificare contrasto/stati hover/focus nelle componenti cliccabili CMS.
- [ ] Uniformare aria-label e naming semantico per componenti tabellari e azioni rapide.

## 5) Modulo Issues

Procedure API disponibili: `issues.list`, `issues.getById`, `issues.create`, `issues.update`, `issues.delete`, `issues.reorder`.

- [ ] Implementare create Issue (form con validazione client coerente a schema).
- [ ] Implementare edit Issue.
- [ ] Gestire errori conflitto slug (`CONFLICT`) con messaggio specifico.

## 6) Modulo Categories

Procedure API disponibili: `categories.list`, `categories.getById`, `categories.create`, `categories.update`, `categories.delete`.

- [ ] Implementare create Category.
- [ ] Implementare edit Category.
- [ ] Gestire conflitto slug (`CONFLICT`) in UX.

## 7) Modulo Tags

Procedure API disponibili: `tags.list`, `tags.getById`, `tags.create`, `tags.update`, `tags.delete`.

- [ ] Implementare create Tag.
- [ ] Implementare edit Tag.
- [ ] Gestire conflitto slug (`CONFLICT`) in UX.

## 8) Modulo Articles

Procedure API disponibili: `articles.list`, `articles.getById`, `articles.create`, `articles.update`, `articles.delete`, `articles.syncTags`, `articles.publish`, `articles.unpublish`, `articles.archive`, `articles.feature`, `articles.unfeature`, `articles.reorder`.

- [ ] Implementare create Article (campi minimi + campi opzionali media).
- [ ] Implementare edit Article.
- [ ] Implementare sync tags articolo (`articles.syncTags`) con selector multi-tag.

## 9) Modulo Users (solo ADMIN)

Procedure API disponibili: `users.list`, `users.getById`, `users.create`, `users.update`, `users.updateRole`, `users.delete`.

- [ ] Implementare create User.
- [ ] Implementare edit User (campi consentiti).

## Definition of Ready - CMS UI pronto

- [ ] Shell CMS operativa con navigation completa.
- [ ] Fondamenta UX/performance P0 completate e verificate.
- [ ] CRUD completo operativo per `Issue`, `Category`, `Tag`, `Article`, `User`.
- [ ] Baseline quality gates attivi (lint, typecheck, build, controllo performance minimo).
- [ ] Sostituire i fallback OG/Twitter con asset editoriali finali in `public/brand/`:
  - [ ] `og-default-1200x630.png`
  - [ ] `twitter-default-1200x630.png`
