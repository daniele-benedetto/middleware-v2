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
- `pnpm exec tsc --noEmit` - typecheck
- `pnpm build` - production build check
- `pnpm prisma:studio` - inspect DB with Prisma Studio

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
