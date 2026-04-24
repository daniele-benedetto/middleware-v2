# CMS Query & Cache Policy

Date: 2026-04-24

Scope:

- CMS list pages under `app/(cms)/cms/*`
- tRPC + React Query behavior for first paint, navigation, and post-mutation consistency

## 1) Default policy

- Shared list query defaults are centralized in `features/cms/shared/hooks/use-cms-list-query.ts`.
- Current defaults:
  - `staleTime: 30_000`
  - `placeholderData: keepPreviousData`
- Goal:
  - keep current page data visible during pagination/filter transitions
  - reduce flicker and unnecessary spinner-only states

## 2) Server prefetch policy

- For CMS first paint on list routes, prefetch on server via direct tRPC caller (no internal HTTP roundtrip).
- Use `lib/cms/trpc/server-prefetch.ts` from server components only.
- Apply on:
  - `issues`, `categories`, `tags`, `users`, `articles` list route entry points
  - `articles` also prefetches filter option queries (`issues.list`, `categories.list`) in parallel

## 3) Client hydration policy

- Client list screens receive `initialData` from server page/screen.
- List hooks (`useIssuesListQuery`, `useCategoriesListQuery`, `useTagsListQuery`, `useUsersListQuery`, `useArticlesListQuery`) accept optional `initialData`.
- Result:
  - first content is available immediately after hydration
  - reactive behavior on search params/mutations remains unchanged

## 4) Allowed overrides

- Keep shared defaults for most list queries.
- Query-specific overrides are allowed only when justified by UX or query cost.
- Current explicit override:
  - article filter option queries in `features/cms/articles/screens/articles-list-screen.tsx` use `staleTime: 60_000`.

## 5) Invalidation matrix (after mutation)

- Shared invalidation utility: `lib/cms/trpc/invalidation.ts`.
- Strategy:
  - always invalidate corresponding list
  - invalidate detail queries for touched ids (`id` or `ids` payload)
- Resource mapping:
  - `issues.*` -> `issues.list` + touched `issues.getById`
  - `categories.*` -> `categories.list` + touched `categories.getById`
  - `tags.*` -> `tags.list` + touched `tags.getById`
  - `users.*` -> `users.list` + touched `users.getById`
  - `articles.*` -> `articles.list` + touched `articles.getById`

## 6) Operational checks

- Required checks after cache/prefetch changes:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
- Smoke checks:
  - first load of each list route renders data without initial empty-state flash
  - filter/sort/page transitions keep previous data visible
  - mutation flows still refresh list and detail views correctly
