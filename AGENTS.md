# Agent Notes (middleware-v2)

## Baseline

- Single-package Next.js app (no monorepo packages despite `pnpm-workspace.yaml`).
- Framework/runtime versions are pinned and modern: `next@16.2.4`, `react@19.2.4`.
- App Router only; main entrypoints are `app/layout.tsx` and `app/page.tsx`.

## Commands (root)

- Install deps: `pnpm install`
- Dev server: `pnpm dev`
- Lint: `pnpm lint`
- Type check (no script provided): `pnpm exec tsc --noEmit`
- Production sanity check: `pnpm build`

## Verified Tooling Quirks

- Tailwind CSS v4 is wired through `postcss.config.mjs` with `@tailwindcss/postcss`; global styles use `@import "tailwindcss"` in `app/globals.css`.
- No `tailwind.config.*` exists; theme tokens are defined via `@theme inline` in `app/globals.css`.
- TS path alias is root-based: `@/*` -> `./*` (see `tsconfig.json`).
- No test framework or test scripts are configured yet; do not assume Jest/Vitest/Playwright.

## Next.js Rule (Required)

- This is not legacy Next.js behavior. Before changing framework-level patterns/APIs, check docs under `node_modules/next/dist/docs/` and follow current deprecations.
