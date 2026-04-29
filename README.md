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

Postgres SSL note:

- prefer `sslmode=verify-full` as the explicit baseline when provider certificate chain and hostname verification are supported
- if you intentionally need current libpq-style `require` semantics, use `uselibpqcompat=true&sslmode=require`

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
- `pnpm seed:admin` - upsert bootstrap admin user

## Quality automation

- Husky hooks:
  - `pre-commit`: runs `lint-staged` on staged files
  - `pre-push`: runs `pnpm check:all`
- VS Code workspace settings are in `.vscode/` and enable format-on-save + ESLint fix-on-save.
- CI workflow (`.github/workflows/ci.yml`) runs full quality checks on PRs and pushes to `main`.
- Recommended local flow before commit:
  - `pnpm fix:all`
  - `pnpm check:all`

CMS governance addendum:

- PR architecture checks are enforced in `.github/pull_request_template.md`.
- CMS architecture audit baseline: `docs/cms-architecture-audit.md`.
- CMS UI audit baseline: `docs/cms-ui-audit.md`.
- CMS guard/role smoke checklist: `docs/cms-smoke-checklist.md`.
- CMS lists smoke checklist: `docs/cms-lists-smoke-checklist.md`.
- CMS lists verification report: `docs/cms-lists-verification-report.md`.
- Required local gates for CMS changes: `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## CMS UI architecture (lists)

Folder map:

- Route shell: `app/(cms)/cms/layout.tsx` (auth gate + sidebar/topbar/breadcrumb wrapper)
- Route entrypoints:
  - `app/(cms)/cms/issues/page.tsx`
  - `app/(cms)/cms/categories/page.tsx`
  - `app/(cms)/cms/tags/page.tsx`
  - `app/(cms)/cms/articles/page.tsx`
  - `app/(cms)/cms/users/page.tsx`
- Screen modules:
  - `features/cms/issues/screens/issues-list-screen.tsx`
  - `features/cms/categories/screens/categories-list-screen.tsx`
  - `features/cms/tags/screens/tags-list-screen.tsx`
  - `features/cms/articles/screens/articles-list-screen.tsx`
  - `features/cms/users/screens/users-list-screen.tsx`
- Shared list framework:
  - query parsing/serialization: `lib/cms/query/list-params.ts`
  - list hooks: `features/cms/shared/hooks/use-cms-domain-list-hooks.ts`
  - selection + quick actions: `features/cms/shared/hooks/use-list-selection.ts`, `features/cms/shared/actions/*`
  - shared UI: `components/cms/common/*` (`BulkActionBar`, `ReorderModeBar`, `ConfirmDialog`, loading/empty/error/pagination)

Page responsibilities:

- Route files are thin adapters (`page.tsx` -> screen component).
- Screen files own list UX orchestration: filters/sort/pagination URL-sync, quick actions, reorder mode, and mutation invalidation.
- Shared hooks/utilities own cross-module behavior (selection state, action resolution, error mapping, list query defaults).

### Query params contract (lists)

Common params on all lists:

- `page` (int >= 1)
- `pageSize` (int >= 1, max 100)
- `q` (trimmed full-text query)
- `sortBy`
- `sortOrder` (`asc` | `desc`)

Module-specific params:

- `issues`: `isActive`, `published`
- `categories`: `isActive`
- `tags`: `isActive`
- `articles`: `status`, `issueId`, `categoryId`, `authorId`, `featured`
- `users`: `role`

Normalization/parsing source of truth:

- `parseIssuesListSearchParams`
- `parseCategoriesListSearchParams`
- `parseTagsListSearchParams`
- `parseArticlesListSearchParams`
- `parseUsersListSearchParams`

All are defined in `lib/cms/query/list-params.ts`.

### Error & permission handling guidelines

- Error mapping is centralized in `lib/cms/trpc/error-messages.ts`.
- Quick-action single/bulk errors are normalized in `features/cms/shared/actions/quick-action-errors.ts`.
- List pages use uniform UX states (`CmsLoadingState`, `CmsEmptyState`, `CmsErrorState`) with retry where allowed.
- Permission handling is defense-in-depth:
  - Route-level server gating (e.g. `app/(cms)/cms/users/page.tsx`)
  - tRPC policy middleware per resource (`lib/server/trpc/routers/*` + module policy files)
  - forbidden states render with explicit messaging instead of silent failures.

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

## API architecture (tRPC-only)

- API entrypoint: `app/api/trpc/[trpc]/route.ts`.
- Server tRPC core: `lib/server/trpc/*` (`init`, `context`, `procedures`, `middlewares`, `routers`).
- Domain logic remains in `lib/server/modules/<resource>/*` (schema/service/repository/dto/policy).
- Frontend client/provider: `lib/trpc/react.ts` and `lib/trpc/provider.tsx`.
- CMS copy is centralized in i18n dictionary (current locale: `it`) under `lib/i18n/*`.
- Role authorization is policy-driven via `lib/server/modules/*/policy` and applied in tRPC router middleware.
- Legacy REST routes under `app/api/v1/**` were removed after the switch.

Current API folder map:

- `app/api/trpc/[trpc]/route.ts` - single tRPC transport handler
- `lib/server/trpc/init.ts` - initTRPC + error formatting
- `lib/server/trpc/context.ts` - request context + Better Auth session
- `lib/server/trpc/procedures.ts` - base procedure builders (`protected`, `write`, `sensitiveWrite`, `publish`, `reorder`)
- `lib/server/trpc/middlewares/*` - `require-role`, `require-session`, `rate-limit`, `audit`
- `lib/server/trpc/routers/*` - resource routers + `appRouter`

Procedures by domain:

- `users`: `list`, `getById`, `create`, `update`, `updateRole`, `delete`
- `issues`: `list`, `getById`, `create`, `update`, `delete`
- `categories`: `list`, `getById`, `create`, `update`, `delete`
- `tags`: `list`, `getById`, `create`, `update`, `delete`
- `articles`: `list`, `getById`, `create`, `update`, `delete`, `syncTags`, `publish`, `unpublish`, `archive`, `feature`, `unfeature`, `reorder`

List procedures validate input with Zod and return typed payload:

- `{ items, pagination: { page, pageSize, total } }`

## Role matrix (procedures)

- `users.*`: `ADMIN` only
- `issues.*`: `ADMIN`, `EDITOR`
- `categories.*`: `ADMIN`, `EDITOR`
- `tags.*`: `ADMIN`, `EDITOR`
- `articles.*`: `ADMIN`, `EDITOR`

Authorization is enforced in tRPC router middleware using `lib/server/modules/*/policy` as source of truth.

## Request/response payloads (CMS real use)

### List pattern

Input (example `articles.list`):

```ts
{
  page?: number;
  pageSize?: number;
  query?: {
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    issueId?: string;
    categoryId?: string;
    authorId?: string;
    featured?: boolean;
    q?: string;
    sortBy?: "createdAt" | "publishedAt" | "position";
    sortOrder?: "asc" | "desc";
  };
}
```

Output:

```ts
{
  items: ArticleDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

### Mutation pattern

Input envelope for update-by-id procedures:

```ts
{
  id: string; // uuid
  data: UpdateInput;
}
```

Representative outputs:

- `users.delete`, `issues.delete`, `categories.delete`, `tags.delete`, `articles.delete` -> `{ success: true }`
- all other mutations -> validated DTO (`UserListItemDto`, `IssueDto`, `CategoryDto`, `TagDto`, `ArticleDto`)

### Representative procedure inputs

- `users.updateRole`

```ts
{
  id: string;
  data: {
    role: "ADMIN" | "EDITOR";
  }
}
```

- `articles.publish`

```ts
{
  id: string;
}
```

- `articles.reorder`

```ts
{
  issueId: string;
  orderedArticleIds: string[]; // unique, min 1
}
```

## API operational baseline

- Pagination baseline: `page` default `1`, `pageSize` default `20`, `pageSize` max `100`.
- Rate-limit baseline (in-memory, per IP + method + path, 60s window):
  - `write`: `60` req/min
  - `sensitive-write` (users management): `20` req/min
  - `publish`: `30` req/min
  - `reorder`: `15` req/min
- Idempotence baseline:
  - `articles.publish` is idempotent when already published (no state rewrite).
  - `articles.reorder` is idempotent when order is unchanged (no updates executed).
- Error policy:
  - client never receives internal stack traces
  - detailed validation metadata is exposed only on bad request errors
  - server logs unexpected/internal errors via `console.error`

## Error model (tRPC)

Domain/runtime errors are normalized to `TRPCError`.

- Validation -> `BAD_REQUEST`
- Unauthorized -> `UNAUTHORIZED`
- Forbidden -> `FORBIDDEN`
- Rate limit -> `TOO_MANY_REQUESTS`
- Not found -> `NOT_FOUND`
- Conflict -> `CONFLICT`
- Internal -> `INTERNAL_SERVER_ERROR`

Notes:

- Validation details are attached to `error.data.details` when available.
- Non-validation/internal details are not leaked to clients.

## CMS visual system (v1)

Design direction: editorial, high contrast, no decorative effects.

- Palette (fixed): `#F0E8D8`, `#E5D9C5`, `#0A0A0A`, `#C8001A`, `#FFFFFF`
- Ink alpha variants (no gray ramp): `ink-60`, `ink-50`, `ink-30`
- Typography roles:
  - display/headings: `Archivo Black`
  - long-form content: `Newsreader`
  - UI labels/metadata: `IBM Plex Mono`
- Surfaces: `border-radius: 0`, `box-shadow: none`
- Strokes: `3px` primary separators, `1px` grid lines, `4px` semantic accent, `3px` reading bar
- Spacing scale: `4, 8, 12, 16, 20, 24, 32, 48, 72`
- Selection: background `#C8001A`, text `#FFFFFF`
- Theme policy: light-only for current phase

Implementation reference:

- Global tokens and grid primitives: `app/globals.css`
- Font variables injection: `app/layout.tsx`
- Extended UI guide and governance: `docs/cms-ui.md`

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
