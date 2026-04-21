# Agent Notes (middleware-v2)

## Baseline

- Single-package Next.js app (no monorepo packages despite `pnpm-workspace.yaml`).
- Framework/runtime versions are pinned and modern: `next@16.2.4`, `react@19.2.4`.
- App Router only; main entrypoints are `app/layout.tsx` and `app/page.tsx`.

## Commands (root)

- Install deps: `pnpm install`
- Dev server: `pnpm dev`
- Lint: `pnpm lint`
- Type check: `pnpm typecheck`
- Production sanity check: `pnpm build`

## Verified Tooling Quirks

- Tailwind CSS v4 is wired through `postcss.config.mjs` with `@tailwindcss/postcss`; global styles use `@import "tailwindcss"` in `app/globals.css`.
- No `tailwind.config.*` exists; theme tokens are defined via `@theme inline` in `app/globals.css`.
- TS path alias is root-based: `@/*` -> `./*` (see `tsconfig.json`).
- No test framework or test scripts are configured yet; do not assume Jest/Vitest/Playwright.
- Prisma schema lives in `prisma/schema.prisma`; generated client output is `lib/generated/prisma`.

## Current Data Decisions

- Single environment for now: Vercel auto-deploy + one production database. Do not assume staging/dev DB split yet.
- Better Auth ID strategy: `User.id` is DB-generated UUID; `Session/Account/Verification.id` is adapter-managed string.
- Article URL strategy: slug is unique per issue (`@@unique([issueId, slug])`).
- Editorial status stays minimal for now: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- Data invariant to enforce in API layer: `publishedAt` must be set only for `PUBLISHED` articles.

## API Readiness Guardrails

- Keep schema changes additive and backward-compatible until multi-environment rollout exists.
- Normalize slugs in API (lowercase, trim, hyphenated) before write; do not rely on DB collation behavior.
- Keep `contentRich` and `audioChunks` backward-compatible with versioned payloads.

## Next.js Rule (Required)

- This is not legacy Next.js behavior. Before changing framework-level patterns/APIs, check docs under `node_modules/next/dist/docs/` and follow current deprecations.
