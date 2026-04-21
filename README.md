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
pnpm prisma:migrate --name init_db
pnpm prisma:generate
```

If the database is already provisioned, the migration command applies pending migrations.

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
