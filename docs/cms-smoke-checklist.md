# CMS Smoke Checklist

Use this checklist for every PR that touches CMS routes, auth guards, list behavior, or role-based visibility.

## 1) Guard and auth behavior

- Unauthenticated user visiting `/cms` is redirected to `/cms/login`.
- Unauthenticated user visiting `/cms/users` is redirected to `/cms/login?next=/cms/users`.
- Authenticated `ADMIN` can open all CMS sections.
- Authenticated `EDITOR` can open editorial sections and cannot access `/cms/users`.
- `/cms/login` redirects to `/cms` when session already exists.

## 2) Navigation and role consistency

- Sidebar hides admin-only entries for `EDITOR`.
- Dashboard quick links hide admin-only entries for `EDITOR`.
- Deep-link behavior stays consistent with sidebar visibility rules.

## 3) Route orchestration rules

- `app/(cms)/cms/*/page.tsx` remains orchestration-only.
- No business logic is introduced in route files.
- Feature logic is implemented under `features/cms/*`.

## 4) List route behavior

Apply on `Issues`, `Categories`, `Tags`, `Articles`, `Users` when relevant:

- Loading state is visible and transitions to data cleanly.
- Empty state is explicit and not confused with loading.
- Error state exposes retry or actionable feedback.
- Search, filters, sort, and pagination update URL state correctly.
- Selection and bulk actions reset or persist coherently after query changes.
- Post-mutation data is refreshed without stale visible state.

## 5) Articles list critical flows

- `publish`, `unpublish`, `feature`, `unfeature`, `archive`, `delete` behave correctly in single and bulk mode.
- Optimistic updates roll back correctly on failure.
- Reorder mode supports enter, move, save, cancel, and coherent refresh.

## 6) Responsive minimum

- Toolbar remains usable on desktop, tablet, and mobile.
- Tables or horizontal scrolling remain usable without hidden actions.
- Confirm dialogs and action bars stay readable on narrow screens.

## 7) Quality gates

- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm build` passes.
