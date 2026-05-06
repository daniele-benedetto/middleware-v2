# Agent Notes (middleware-v2)

## Baseline

- Single-package Next.js app (no monorepo packages despite `pnpm-workspace.yaml`).
- Framework/runtime versions are pinned and modern: `next@16.2.4`, `react@19.2.4`.
- App Router only; main entrypoints are `app/layout.tsx` and `app/page.tsx`.

## Commands (root)

- Install deps: `pnpm install`
- Dev server: `pnpm dev`
- Test: `pnpm test:run`
- Coverage: `pnpm test:coverage`
- Lint: `pnpm lint`
- Type check: `pnpm typecheck`
- Production sanity check: `pnpm build`

## Verified Tooling Quirks

- Tailwind CSS v4 is wired through `postcss.config.mjs` with `@tailwindcss/postcss`; global styles use `@import "tailwindcss"` in `app/globals.css`.
- No `tailwind.config.*` exists; theme tokens are defined via `@theme inline` in `app/globals.css`.
- TS path alias is root-based: `@/*` -> `./*` (see `tsconfig.json`).
- Vitest is configured for Node-based, docker-free unit tests under `tests/unit/**`; `server-only` imports are shimmed in test via `vitest.config.ts`.
- No browser E2E framework is configured yet; do not assume Playwright/Cypress.
- Prisma schema lives in `prisma/schema.prisma`; generated client output is `lib/generated/prisma`.

## Current Data Decisions

- Single environment for now: Vercel auto-deploy + one production database. Do not assume staging/dev DB split yet.
- Better Auth ID strategy: `User.id` is DB-generated UUID; `Session/Account/Verification.id` is adapter-managed string.
- Access model: `ADMIN` can manage users and assign roles; `EDITOR` can manage all editorial resources but cannot access user-management endpoints.
- Delete policy: hard delete for all resources.
- Article URL strategy: slug is unique per issue (`@@unique([issueId, slug])`).
- Editorial status stays minimal for now: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- Data invariant to enforce in API layer: `publishedAt` must be set only for `PUBLISHED` articles.

## API Readiness Guardrails

- Keep schema changes additive and backward-compatible until multi-environment rollout exists.
- Normalize slugs in API (lowercase, trim, hyphenated) before write; do not rely on DB collation behavior.
- Keep `contentRich` and `audioChunks` backward-compatible with versioned payloads.

## API Architecture Rules

- API surface is tRPC-only through `app/api/trpc/[trpc]/route.ts`.
- Server code is split by responsibility:
  - `lib/server/auth/*` for session + role types
  - `lib/server/http/*` for shared error/rate-limit/audit utilities
  - `lib/server/trpc/*` for context, procedures, middleware, routers
  - `lib/server/validation/*` for shared validation helpers
  - `lib/server/modules/<resource>/*` with `repository`, `service`, `dto`, `schema`, `policy`
- Mark server-only modules with `import "server-only"` where applicable.
- For CMS APIs, keep route segment config explicit on tRPC handler: `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
- Validate procedure input with Zod and validate service output DTOs with `parseOutput` before returning.
- Keep role authorization policy-driven: use `modules/*/policy` in router middleware, avoid hardcoded role arrays in procedures.

## Clean Code Rules (Required)

- Single responsibility everywhere: one file/module should have one clear purpose.
- Keep tRPC routers orchestration-only; business rules belong to service layer, data access to repository layer.
- Prefer small, composable functions with explicit names; avoid multi-purpose "god" functions.
- No hidden side effects in helpers; keep validation/mapping/normalization deterministic and testable.
- Keep DTO/schema/policy/repository/service separated; do not collapse layers for convenience.
- Remove dead code and placeholder branches when implementing real logic; keep TODOs explicit if work is deferred.
- Prefer explicit types at module boundaries (request parsing, service input/output, repository contracts).
- Reuse shared utilities (`lib/server/http/*`, `lib/server/validation/*`) instead of duplicating logic per route.

## Next.js Rule (Required)

- This is not legacy Next.js behavior. Before changing framework-level patterns/APIs, check docs under `node_modules/next/dist/docs/` and follow current deprecations.
