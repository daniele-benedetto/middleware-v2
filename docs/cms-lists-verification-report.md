# CMS Lists Verification Report

Date: 2026-04-24

Scope: verifica delle pagine lista CMS (`Issues`, `Categories`, `Tags`, `Articles`, `Users`) seguendo `docs/cms-lists-smoke-checklist.md`.

## Verifiche eseguite

### 1) Permessi ruolo in UI (`ADMIN` vs `EDITOR`)

- `Users` e protetta lato server tramite `requireCmsSession` + `hasCmsRole("ADMIN")` direttamente in `app/(cms)/cms/users/page.tsx`.
- Le procedure `users.*` sono `ADMIN` only via policy router (`lib/server/trpc/routers/users.ts`).
- La navigazione CMS filtra le voci in base al ruolo (sidebar/topbar wiring dal layout CMS).

Esito: PASS

### 2) Flussi critici Articles in lista

- Azioni rapide single + bulk presenti: `publish`, `unpublish`, `archive`, `feature`, `unfeature`, `delete`.
- Reorder mode attiva su vincoli dedicati (`issueId`, sort per `position`, singola pagina) con save/cancel.
- Invalidation centralizzata post-mutation.

Esito: PASS

### 3) Gestione errori reali API

- Mapping centralizzato codici tRPC in `lib/cms/trpc/error-messages.ts`.
- UX dominio articoli con copy esplicita per `CONFLICT`, `BAD_REQUEST`, `TOO_MANY_REQUESTS` in `features/cms/articles/screens/articles-list-screen.tsx`.
- Mapping errori centralizzato per quick action single/bulk in `features/cms/shared/actions/quick-action-errors.ts`.

Esito: PASS

### 4) Responsive minimo desktop/tablet/mobile

- Pattern responsive presenti su toolbar e action bar (`max-sm:*`, grid adattive, wrap bottoni).
- Dialog di conferma full-width mobile-safe (`w-full` + max width controllata).
- Tabelle con layout consistente e controlli azione utilizzabili nelle tre view target.

Esito: PASS

## Qualita build

Comandi eseguiti:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

Esito: PASS
