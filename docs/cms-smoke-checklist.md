# CMS Smoke Checklist

Use this checklist for every PR that touches CMS routes, auth guards, or role-based visibility.

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

## 4) Quality gates

- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm build` passes.
