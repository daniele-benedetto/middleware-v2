# middleware-v2

Next.js 16 app for a magazine CMS with Postgres, Prisma, and Better Auth.

## Stack

- Next.js `16.2.4` (App Router)
- React `19.2.4`
- Prisma `7.x` + PostgreSQL
- Better Auth + Prisma adapter

## Environment

Copy `.env.example` into `.env` and set real values:

```bash
cp .env.example .env
```

Required vars:

- `DATABASE_URL`: Postgres connection string
- `BETTER_AUTH_SECRET`: Better Auth signing secret
- `BETTER_AUTH_URL`: app base URL

## Setup

```bash
pnpm install
pnpm prisma:format
pnpm prisma:validate
pnpm prisma:generate
```

Current setup runs with a single database as source of truth (Vercel auto-deploy).

## Development commands

- `pnpm dev` - start Next.js dev server
- `pnpm lint` - run ESLint
- `pnpm lint:fix` - apply ESLint autofixes
- `pnpm typecheck` - run TypeScript typecheck
- `pnpm format` - run Prettier write mode
- `pnpm format:check` - run Prettier check mode
- `pnpm fix:all` - run formatter + lint autofix
- `pnpm check:all` - run lint + typecheck + prisma validate + build
- `pnpm build` - production build check
- `pnpm prisma:studio` - inspect DB with Prisma Studio

## Quality automation

- Husky hooks:
  - `pre-commit`: runs `lint-staged` on staged files
  - `pre-push`: runs `pnpm check:all`
- VS Code workspace settings are in `.vscode/` and enable format-on-save + ESLint fix-on-save.
- CI workflow (`.github/workflows/ci.yml`) runs full quality checks on PRs and pushes to `main`.
- Recommended local flow before commit:
  - `pnpm fix:all`
  - `pnpm check:all`

## Prisma conventions

- Schema path: `prisma/schema.prisma`
- Prisma config path: `prisma.config.ts`
- Generated client output: `lib/generated/prisma`
- Prisma client singleton: `lib/prisma.ts`

Naming conventions used in schema:

- Prisma models in PascalCase (`Article`, `ArticleTag`)
- DB tables mapped in snake_case/plural with `@@map` (for example `articles`, `article_tags`)
- App fields in camelCase; explicit DB naming handled via Prisma mapping

## Better Auth integration

- Auth config: `lib/auth.ts`
- DB adapter: `better-auth/adapters/prisma`
- Core auth models in Prisma schema: `User`, `Session`, `Account`, `Verification`

## Migration strategy

- Create new tables/columns with backward-compatible migrations first.
- Avoid destructive renames/drops in one step; prefer add -> backfill -> switch reads/writes -> drop later.
- Use `pnpm prisma:migrate --name <change_name>` for versioned changes.

## Data rules (current phase)

- `Article.slug` is unique within an issue (`@@unique([issueId, slug])`).
- Slug normalization is handled in API layer before write: lowercase, trim, hyphenate.
- `Article.publishedAt` is an API-layer invariant: set only when status is `PUBLISHED`.
- `contentRich` and `audioChunks` are JSON payloads and should be evolved with backward-compatible versioned structures.

## API list contract (`/api/v1`)

All list endpoints return `meta.pagination` and validate query params with Zod.

Common params:

- `page` (default `1`, min `1`)
- `pageSize` (default `20`, min `1`, max `100`)
- `sortOrder` (`asc` or `desc`, default `desc`)

Resource-specific filters and sorting:

- `GET /api/v1/users`
  - filters: `role`, `q`
  - sortBy: `createdAt`, `email`
- `GET /api/v1/issues`
  - filters: `isActive`, `published`, `q`
  - sortBy: `createdAt`, `sortOrder`, `publishedAt`
- `GET /api/v1/categories`
  - filters: `isActive`, `q`
  - sortBy: `createdAt`, `name`, `slug`
- `GET /api/v1/tags`
  - filters: `isActive`, `q`
  - sortBy: `createdAt`, `name`, `slug`
- `GET /api/v1/articles`
  - filters: `status`, `issueId`, `categoryId`, `authorId`, `featured`, `q`
  - sortBy: `createdAt`, `publishedAt`, `position`

Invalid query params return `400` with `VALIDATION_ERROR`.

## API operational baseline

- Pagination baseline: `page` default `1`, `pageSize` default `20`, `pageSize` max `100`.
- Rate-limit baseline (in-memory, per IP + method + path, 60s window):
  - `write`: `60` req/min
  - `sensitive-write` (users management): `20` req/min
  - `publish`: `30` req/min
  - `reorder`: `15` req/min
- Idempotence baseline:
  - `POST /api/v1/articles/:id/publish` is idempotent when already published (no state rewrite).
  - `POST /api/v1/articles/reorder` is idempotent when order is unchanged (no updates executed).
- Error policy:
  - client never receives internal stack traces
  - detailed `error.details` is returned only for `VALIDATION_ERROR`
  - server logs unexpected/internal errors via `console.error`

### Query/index verification snapshot

- `articles` list filters/sort are covered by existing indexes (`issueId+position`, `status+publishedAt`, `status+isFeatured`, `categoryId`, `authorId`, `slug`).
- `issues` list is partially covered (`isActive+sortOrder`, `publishedAt`), while `createdAt` sorting has no dedicated index.
- `categories` and `tags` rely on unique `slug` and `isActive` index; `createdAt` and `name` sorting/filtering are currently not indexed.
- `users` has unique `email`; `role` + `createdAt` listing is currently not indexed.

## Definition of Ready (next phase: API)

Before starting API implementation, keep these conditions true:

- Prisma schema is stable and reviewed against editorial flow.
- Slug/status/auth-ID decisions are documented and unchanged.
- Query indexes for listing and publish flows are confirmed.
- README + AGENTS reflect the real single-env operating model.

## Team workflow conventions

- Branch naming:
  - `feat/<short-description>`
  - `fix/<short-description>`
  - `chore/<short-description>`
- Commit naming: Conventional Commits (`feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`).
- PR checklist (minimum):
  - migration added/updated when schema changes
  - docs updated (`README.md` and/or `AGENTS.md`) when workflow changes
  - rollback note for risky schema or runtime changes
- Production migrations policy:
  - do not use `prisma migrate dev` in production
  - use `prisma migrate deploy` in CI/CD on release
