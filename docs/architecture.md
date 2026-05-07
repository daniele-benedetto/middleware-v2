# Architecture Overview

This document is the short, current overview of how `middleware-v2` is wired.

Use it as the entrypoint before diving into the deeper audit, UI, or checklist docs.

## System Snapshot

- Single-package Next.js 16 app with App Router.
- React 19, RSC-first CMS, Tailwind v4.
- tRPC-only API surface at `app/api/trpc/[trpc]/route.ts`.
- Prisma + Postgres for application data.
- Better Auth for session management.
- Vercel Blob for CMS media upload and private asset proxying.
- Redis-backed rate limiting is mandatory in production.

## Where Things Live

- `app/(cms)/cms/*`: CMS routes, layouts, and thin server entrypoints.
- `app/(auth)/cms/login/*`: login route.
- `features/cms/*`: domain screens, hooks, and feature-scoped components.
- `components/cms/*`: shared CMS primitives, layout parts, and common UI states.
- `lib/cms/*`: frontend shared auth, query, invalidation, and error-mapping helpers.
- `lib/server/trpc/*`: transport, context, procedure builders, middleware, and routers.
- `lib/server/modules/<resource>/*`: per-domain `schema`, `dto`, `policy`, `repository`, `service`.
- `prisma/schema.prisma`: data model.
- `lib/prisma.ts`: Prisma client singleton.

## Request Flow

```text
CMS page/request
  -> App Router route or layout
  -> auth gate / param parsing / prefetch
  -> feature screen
  -> tRPC client call
  -> /api/trpc
  -> tRPC context + middleware
  -> router
  -> service
  -> repository
  -> Prisma
  -> Postgres
```

## CMS Route Model

- CMS pages live under `app/(cms)/cms`.
- `app/(cms)/cms/layout.tsx` protects the CMS shell server-side through `requireCmsSession("/cms")`.
- Route files are intentionally thin and delegate UI composition to `features/cms/<resource>/screens/*`.
- Route params are validated at the boundary before page logic continues.
- RSC is the default; client components are used only where interaction is required.

## tRPC Backend Model

- `app/api/trpc/[trpc]/route.ts` is the single API transport.
- `createTrpcContext()` attaches the raw `Request` plus the resolved auth session.
- Base procedures in `lib/server/trpc/procedures.ts` layer auth and rate-limit behavior.
- Resource routers orchestrate only: input parsing, policy checks, service calls, and output validation.
- Services enforce domain rules and cross-entity invariants.
- Repositories own database access, Prisma `select`s, and transactions.
- DTOs are validated again on the way out before data reaches the client.

## Data Fetching And Cache

- CMS list first paint is prefetched server-side through the direct tRPC caller in `lib/cms/trpc/server-prefetch.ts`.
- Shared React Query defaults live in `lib/cms/trpc/query-policy.ts` and are applied by `lib/trpc/provider.tsx`.
- List hooks keep previous data visible during filter, sort, and pagination changes.
- Post-mutation cache invalidation is centralized in `lib/cms/trpc/invalidation.ts`.

## Auth And Roles

- Better Auth is the source of truth for sessions.
- `lib/server/auth/session.ts` resolves the request session once at the backend boundary.
- `lib/cms/auth.ts` wraps CMS session access with `react.cache` for request-local reuse in server components.
- Authorization is defense-in-depth:
  - CMS route/layout gating for protected pages.
  - tRPC middleware + module policy for API access.
  - Media upload/blob routes also verify session and role before touching Blob storage.

Current role matrix:

- `users.*`: `ADMIN`
- `auditLogs.*`: `ADMIN`
- `issues.*`: `ADMIN`, `EDITOR`
- `categories.*`: `ADMIN`, `EDITOR`
- `tags.*`: `ADMIN`, `EDITOR`
- `articles.*`: `ADMIN`, `EDITOR`
- `media.*`: `ADMIN`, `EDITOR`

## Media Flow

Upload flow:

1. The client calls `POST /api/cms/media/upload`.
2. The route uses `handleUpload()` from Vercel Blob.
3. `onBeforeGenerateToken` checks session and role, validates file name/path, restricts kinds, and sets max size.
4. The browser uploads directly to Blob; the app does not proxy file bytes through the app server.

Read/download flow:

1. CMS UI resolves preview/download URLs through `/api/cms/media/blob?pathname=...`.
2. `app/api/cms/media/blob/route.ts` checks session and role before reading any blob.
3. The route fetches the private blob and streams it back with `cache-control: private, no-store, max-age=0`.

## Runtime Invariants

- Single environment for now: one production deployment and one production database, no staging split assumed.
- tRPC is the only application API surface.
- Redis-backed rate limiting is required in production.
- If Redis is missing or unavailable in production, rate-limited CMS writes fail closed.
- Local development and tests may fall back to in-memory rate-limit counters.
- Resource deletion is hard delete.
- `Article.slug` is unique per issue and normalized before persistence.
- `publishedAt` must only be set when an article status is `PUBLISHED`.
- `contentRich` and `audioChunks` should remain backward-compatible versioned payloads.

## Decision Boundaries

- Put business rules in `service`.
- Put database access in `repository`.
- Keep routers and App Router pages orchestration-only.
- Keep shared CMS UI in `components/cms` and domain-specific composition in `features/cms`.
- Prefer extending existing shared helpers over duplicating list/query/error logic per resource.

## Related Docs

- `README.md`: operational setup and API baseline.
- `AGENTS.md`: repo-specific engineering rules.
- `docs/cms-ui.md`: CMS visual system and component governance.
- `docs/cms-smoke-checklist.md`: guard and role smoke checks.
