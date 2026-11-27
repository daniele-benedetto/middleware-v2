# middleware-v2

Next.js 16 app for the Middleware magazine: public editorial site plus CMS, with Postgres, Prisma, Better Auth, Redis and S3-compatible media storage.

## Stack

- Next.js `16.4.6` (App Router, Cache Components) + React `19.2.7`
- Prisma `7.x` + PostgreSQL
- Better Auth + Prisma adapter
- tRPC + TanStack Query
- Tailwind CSS v4

## Docs

- `docs/architecture.md`: architecture, runtime invariants, auth, media flow, data fetching and cache.
- `docs/cms-ui.md`: CMS visual system, component governance, print edition.
- `docs/production-ops.md`: production runbook (VPS, deploy, backup, disaster recovery).
- `AGENTS.md`: engineering rules for agents and contributors.

## Environment

Copy `.env.example` into `.env` and set real values:

```bash
cp .env.example .env
```

Required vars:

- `DATABASE_URL`: Postgres connection string
- `BETTER_AUTH_SECRET`: Better Auth signing secret
- `BETTER_AUTH_URL`: app base URL
- `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME` (optional): used only by `pnpm auth:bootstrap-admin`
- `AUDIT_LOG_RETENTION_DAYS`: audit-log retention window for `pnpm audit:prune`
- `REDIS_URL`: Redis connection string for rate limiting; required in production, optional in local dev/test

Postgres SSL: prefer `sslmode=verify-full`; for libpq-style `require` semantics use `uselibpqcompat=true&sslmode=require`.

## Local stack

Docker runs Postgres, Redis and MinIO (S3-compatible); the app runs locally against them.

```bash
pnpm install
pnpm docker:infra:up
pnpm prisma:migrate:deploy
pnpm auth:bootstrap-admin
pnpm dev
```

| Service       | Endpoint                |
| ------------- | ----------------------- |
| App           | `http://localhost:3000` |
| Postgres      | `localhost:5432`        |
| Redis         | `localhost:6379`        |
| MinIO API     | `http://localhost:9000` |
| MinIO Console | `http://localhost:9001` |

Local MinIO: access key `minioadmin`, secret key `minioadmin`, bucket `middleware-media`. Stop with `pnpm docker:infra:down`.

## Local analytics stack

Umami runs as a separate stack with its own Postgres database (never the application database).

```bash
cp .env.analytics.example .env.analytics
pnpm docker:analytics:up
```

Umami is on `http://localhost:3001` (default credentials `admin` / `umami`), its Postgres on `localhost:5433`. Create a local website entry and copy its id into the app env.

Public app variables (all optional):

- `NEXT_PUBLIC_UMAMI_SRC`: local default `http://localhost:3001/script.js`
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID`: website id from Umami
- `NEXT_PUBLIC_UMAMI_DOMAINS`: comma-separated host allowlist, e.g. `middleware.media,www.middleware.media`
- `NEXT_PUBLIC_UMAMI_PERFORMANCE`: `true` enables Core Web Vitals collection (Umami `v3.1.0`+)
- `NEXT_PUBLIC_UMAMI_DO_NOT_TRACK`: defaults to `true`
- `NEXT_PUBLIC_UMAMI_EXCLUDE_SEARCH`: `true` avoids collecting query strings
- `NEXT_PUBLIC_UMAMI_EXCLUDE_HASH`: defaults to `true`
- `NEXT_PUBLIC_PRIVACY_BANNER_MODE`: `acknowledge` (default) or `consent` to load Umami only after explicit consent
- `NEXT_PUBLIC_TWITTER_HANDLE`: X/Twitter handle emitted as `twitter:creator`
- `NEXT_PUBLIC_SOCIAL_PROFILES`: comma-separated `https://` profile URLs for `Organization.sameAs`

In production these are set in `.env.production`, read by `scripts/production-deploy-manual.sh`.

The analytics compose file pins the Umami image by digest. When updating Umami, verify tracker attribute support, update the digest intentionally and smoke-test pageviews (and Performance, if enabled). Stop with `pnpm docker:analytics:down`.

## Commands

- `pnpm dev`: Next.js dev server
- `pnpm test` / `pnpm test:run` / `pnpm test:coverage`: Vitest (watch / once / with V8 coverage)
- `pnpm lint` / `pnpm lint:fix`: ESLint
- `pnpm typecheck`: TypeScript
- `pnpm format` / `pnpm format:check`: Prettier
- `pnpm fix:all`: Tailwind var normalization + Prettier + ESLint autofix
- `pnpm check:all`: Tailwind vars check + format check + lint + typecheck + tests + Prisma validate + build
- `pnpm build` / `pnpm build:analyze`: production build (optionally with bundle analyzer)
- `pnpm auth:bootstrap-admin`: create the first `ADMIN` when none exists
- `pnpm seed:articles`: seed the first issue and articles
- `pnpm audit:prune`: delete audit log entries older than `AUDIT_LOG_RETENTION_DAYS`
- `pnpm prisma:migrate`: create a versioned migration in development
- `pnpm prisma:migrate:deploy`: apply migrations in production/CI
- `pnpm prisma:studio`: inspect the DB
- `pnpm deploy:production:dry-run` / `pnpm deploy:production`: manual production deploy (see `docs/production-ops.md`)

## Quality automation

- Husky: `pre-commit` runs `lint-staged`; `pre-push` runs `pnpm check:all`.
- Vitest runs docker-free unit tests under `tests/unit/**` in a Node environment.
- CI (`.github/workflows/ci.yml`) runs the full quality checks on PRs and pushes to `main`.
- PR architecture checks live in `.github/pull_request_template.md`.
- `.vscode/` enables format-on-save and ESLint fix-on-save.

## Prisma conventions

- Schema: `prisma/schema.prisma`; config: `prisma.config.ts`; generated client: `lib/generated/prisma`; singleton: `lib/prisma.ts`.
- Models in PascalCase, tables mapped to snake_case plural with `@@map`, fields in camelCase.
- Migrations are additive and backward-compatible: add -> backfill -> switch reads/writes -> drop later.
- Never use `prisma migrate dev` in production.

## Team workflow

- Branches: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`.
- Commits: Conventional Commits (`feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`).
- PRs: include the migration when the schema changes, update docs when workflow changes, add a rollback note for risky schema or runtime changes.
