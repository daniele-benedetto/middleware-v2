# TODO - Fase API (pre-CMS) - struttura ordinata e scalabile

Contesto: Next.js 16 (App Router), Better Auth, Prisma, DB unico in produzione.

Decisioni gia fissate:

- Hard delete per tutte le entita.
- `ADMIN` puo gestire utenti e assegnare ruoli.
- `EDITOR` puo gestire tutto il resto (dominio editoriale), ma non utenti.

## 8.5) Switch completo a tRPC (API interna frontend)

Obiettivo:

- Centralizzare tutta la superficie API su tRPC mantenendo service/repository esistenti.
- Eliminare totalmente il residuo REST (`app/api/v1/**`) a migrazione completata.

Piano operativo dettagliato:

- [ ] Installare stack tRPC (`@trpc/server`, `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query`, `superjson`).
- [ ] Creare infrastruttura core tRPC:
  - [ ] `lib/server/trpc/init.ts` (initTRPC, formatter errori, transformer).
  - [ ] `lib/server/trpc/context.ts` (sessione Better Auth + metadata request).
  - [ ] `lib/server/trpc/procedures.ts` (`protected`, `admin`, `editorial`).
  - [ ] `lib/server/trpc/middlewares/*` (role guard, rate-limit, audit).
- [ ] Creare router tRPC per dominio con mapping 1:1 alle capability attuali:
  - [ ] `users` (`list/getById/create/update/updateRole/delete`).
  - [ ] `issues` (`list/getById/create/update/delete`).
  - [ ] `categories` (`list/getById/create/update/delete`).
  - [ ] `tags` (`list/getById/create/update/delete`).
  - [ ] `articles` (`list/getById/create/update/delete/syncTags/publish/unpublish/archive/feature/unfeature/reorder`).
- [ ] Esporre endpoint unico tRPC in `app/api/trpc/[trpc]/route.ts`.
- [ ] Integrare client/provider tRPC nel frontend (`lib/trpc/*` + provider root).
- [ ] Migrare tutte le chiamate frontend da REST a procedure tRPC typed.
- [ ] Verificare parity funzionale completa (auth, autorizzazioni, invarianti, rate-limit, idempotenza).
- [ ] Eliminare tutto il residuo REST a switch completato:
  - [ ] rimuovere `app/api/v1/**`.
  - [ ] rimuovere helper HTTP non piu usati legati al modello REST.
  - [ ] pulire import, dead code e riferimenti documentali REST.
- [ ] Aggiornare documentazione tecnica (`README.md`, `AGENTS.md`) con architettura tRPC-only.

Definition of done (8.5):

- [ ] Nessuna route REST residua attiva.
- [ ] Frontend usa solo tRPC.
- [ ] Build/typecheck verdi dopo cleanup finale.

## 9) Testing API (target tRPC)

- [ ] Definire stack test integration tRPC (consigliato: Vitest + DB test dedicato + seed minimo).
- [ ] Implementare test harness condiviso per caller tRPC (context builder, auth/session helper).
- [ ] Introdurre test integration tRPC (auth, CRUD, publish flow, slug conflict).
- [ ] Test autorizzazioni: admin allowed / editor forbidden su users.
- [ ] Test invarianti dominio (`publishedAt/status`, slug).
- [ ] Test rate-limit e idempotenza (`publish`, `reorder`).
- [ ] Smoke test manuale con collezione HTTP minima per healthcheck + script di verifica procedure tRPC.

## 10) Documentazione tecnica API

- [ ] Aggiornare `README.md` con struttura cartelle API e convenzioni.
- [ ] Documentare matrice permessi ruoli.
- [ ] Documentare payload request/response reali per frontend CMS.
- [ ] Documentare casi d'errore e codici HTTP per endpoint.

## Definition of Ready - Inizio sviluppo CMS UI

- [ ] Struttura cartelle API applicata e consistente (single responsibility reale).
- [ ] CRUD completo per `Issue`, `Category`, `Tag`, `Article`.
- [ ] Endpoint utenti disponibili e accessibili solo ad `ADMIN` (incluso `PATCH /users/:id/role`).
- [ ] Hard delete implementato e testato su tutte le risorse.
- [ ] Azioni editoriali (`publish/archive/feature/reorder`) operative.
- [ ] Error model + validazione + autorizzazioni coerenti e documentate.
