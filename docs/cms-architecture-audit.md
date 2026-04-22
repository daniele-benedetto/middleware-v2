# CMS Architecture Audit (Task 2.5)

Date: 2026-04-22

Scope:

- CMS frontend structure (`app/(cms)`, `components/cms`, `lib/cms`, `lib/trpc`)
- Separation of responsibilities with Next.js 16 App Router practices
- Risk of route-centric growth while implementing full CRUD modules

Out of scope:

- Visual/UI conformance to style guide (tracked in task 2.6)

## 1) Current structure snapshot

App routes:

- `app/(cms)/cms/layout.tsx` (auth gate + shell composition)
- `app/(cms)/cms/page.tsx` (dashboard)
- `app/(cms)/cms/{issues,categories,tags,articles,users}/page.tsx` (resource entries)
- `app/(auth)/cms/login/page.tsx` (login page)

CMS UI layers:

- `components/cms/primitives/*` -> layout and page primitives
- `components/cms/common/*` -> reusable list/feedback widgets
- `components/cms/layout/*` -> sidebar/topbar/breadcrumbs shell parts
- `components/cms/pages/resource-page.tsx` -> placeholder resource composition

CMS shared libs:

- `lib/cms/auth.ts` -> session retrieval for CMS routes
- `lib/cms/navigation.ts` -> nav map
- `lib/auth-client.ts` -> Better Auth client

Backend boundary already clean:

- tRPC-only transport in `app/api/trpc/[trpc]/route.ts`
- server modules split by dto/schema/policy/repository/service under `lib/server/modules/*`

## 2) What is already aligned

- Route handlers are mostly orchestration-only (good App Router discipline).
- Domain/business logic is not in page components.
- Server-only concerns are isolated in `lib/server/*` and `lib/cms/auth.ts`.
- Shared CMS shell and common primitives reduce duplication.

## 3) Gaps and risks (structure)

### High

1. Repeated session fetch path in CMS request flow

- `app/(cms)/cms/layout.tsx` and `app/(cms)/cms/users/page.tsx` both call `getCmsSession()`.
- Current implementation in `lib/cms/auth.ts` has no request-level memoization.
- Risk: duplicate auth DB hits per request in nested server component tree.

2. Authorization checks are page-local and not standardized

- Admin gate currently coded inline in `app/(cms)/cms/users/page.tsx`.
- Risk: as modules grow, policies can drift and become inconsistent.

### Medium

3. Missing feature folders for CMS frontend domains

- Current CMS frontend is grouped by technical type (`common`, `primitives`, `layout`) but not by resource domain.
- Risk: when CRUD logic lands, pages can become route-centric with per-route hook/query/transform duplication.

4. No shared CMS query param/parsing contract yet

- Not yet present for list pages (`page`, `pageSize`, `q`, filters, sorting).
- Risk: each page invents its own URL contract and parsing behavior.

5. No standardized client data access layer per CMS domain

- tRPC provider exists, but resource-level query/mutation hooks are not organized yet.
- Risk: direct inline usage from route files and component sprawl.

### Low

6. Barrel exports are useful but currently shallow

- `components/cms/pages/index.ts` exports only one placeholder screen.
- Low risk now, but should evolve to feature-level entrypoints.

## 4) Target structure (recommended)

Keep App Router thin and move domain UI logic into feature modules.

Suggested layout:

- `app/(cms)/cms/<resource>/page.tsx` -> route orchestration only
- `features/cms/<resource>/screen.tsx` -> page composition
- `features/cms/<resource>/hooks/*` -> query/mutation hooks
- `features/cms/<resource>/schemas/*` -> client-side input/search-param schemas
- `features/cms/<resource>/mappers/*` -> DTO -> view model mapping
- `lib/cms/auth/*` -> cached session + role guards
- `lib/cms/query/*` -> shared URL params parsing/serialization

## 5) Execution plan (milestones)

### Milestone A - Quick wins (safe, low churn)

1. Add request-level caching for CMS session resolver.
2. Introduce shared guard helpers (`requireCmsSession`, `requireCmsRole`).
3. Define shared query params helper for list pages in `lib/cms/query`.

### Milestone B - Structural refactor for scale

1. Introduce `features/cms/*` domain folders.
2. Move resource screen composition out of `app/(cms)/cms/*/page.tsx`.
3. Add resource-level client hooks and mappers.

### Milestone C - Governance and anti-regression

1. Add architecture checklist to PR workflow (route thinness, no business logic in pages).
2. Add smoke checklist for guard behavior and role consistency.
3. Keep `pnpm lint`, `pnpm typecheck`, `pnpm build` as mandatory gates.

## 6) Severity backlog (actionable)

- High: cached session + shared role guard helpers.
- Medium: feature folders + shared query contract + resource hook layer.
- Low: improve barrel conventions as feature modules grow.

## 7) Deliverables completed in task 2.5

- Architecture mapping completed.
- Best-practice conformance review completed.
- Prioritized refactor backlog completed.
- Milestone rollout plan completed.
