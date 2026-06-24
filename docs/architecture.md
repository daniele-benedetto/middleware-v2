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
- `components/public/primitives/*`: public visual atoms and class helpers, with no data fetching.
- `components/public/compounds/*`: small public UI assemblies composed from primitives.
- `components/public/sections/*`: route-agnostic public page sections such as the issue dossier.
- `components/public/pages/*`: public page-level compositions used by App Router entrypoints.
- `lib/cms/*`: frontend shared auth, query, invalidation, and error-mapping helpers.
- `lib/public/server/*`: cache-safe public data loaders for static/ISR page rendering.
- `lib/public/types/*`: type-only public DTO aliases shared by loaders and components.
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
- The public home uses `lib/public/server/home.ts` as its single data loader for page rendering and metadata.
- Public home data is cached with `unstable_cache` and `PUBLIC_HOME_REVALIDATE_SECONDS` because issue publishing is infrequent.
- The public home loader calls the public issue service directly, not the request-bound tRPC caller, so it is safe to reuse across requests.
- The public home loader uses `publicIssuesService.listPublishedItems()` for archive cards, avoiding the `countPublished()` query used by paginated API responses.
- Public issue pages use `lib/public/server/issue-page.ts`; they are generated from published issue slugs and share the same one-hour ISR policy.
- Public static CMS pages use `lib/public/server/page.ts`; only slugs listed in `PUBLIC_STATIC_PAGE_SLUGS` are routed publicly at top level.
- Public route segment `revalidate` exports must stay literal numbers, such as `3600`, because Next.js validates segment config statically.
- Public loaders must not call `getTrpcCaller()` because it depends on request headers and makes otherwise static pages request-bound.
- Article `contentPreview` is derived and capped server-side before serialization; fully removing `contentRich` from home queries requires persisted derived fields such as `readingTimeMinutes` and `contentPreview`.
- The public home cache tag is `PUBLIC_HOME_CACHE_TAG` (`public-home`); use `revalidateTag(PUBLIC_HOME_CACHE_TAG)` when CMS publish flows need immediate public refresh.
- The public issue cache tag is `PUBLIC_ISSUE_PAGE_CACHE_TAG` (`public-issue`); use `revalidateTag(PUBLIC_ISSUE_PAGE_CACHE_TAG)` when published issue pages need immediate refresh.
- The public static page cache tag is `PUBLIC_PAGE_CACHE_TAG` (`public-page`); use it when CMS page publishing needs immediate refresh.

## Public Frontend Composition

- App Router files under `app/(public)/*` stay thin: load data, build metadata, handle `notFound()`, and render a page component.
- Page-level public compositions live in `components/public/pages/*`; reuse them when two routes share the same layout, as `/` and `/uscite/[slug]` do with `PublicHomePage`.
- CMS-authored public page bodies render TipTap JSON server-side through `components/public/rich-text/*`; do not ship the CMS editor to public routes.
- Sections live in `components/public/sections/*` when they represent a route-agnostic content band or editorial block.
- Compounds live in `components/public/compounds/*` when a small assembly is reusable across sections but is not a full section by itself.
- Primitives live in `components/public/primitives/*` when they are visual atoms, typography helpers, or token-backed classes with no route or data knowledge.
- Shared public view-model helpers can live beside the section/page that owns the shape. Keep them deterministic and data-only.
- Public components should receive already-shaped props and should not import server loaders.
- Prefer CSS and small vanilla client components for baseline interaction. Add GSAP only for a concrete editorial motion requirement that cannot be served well by CSS.

Minimal route pattern for a new public page:

```tsx
import { SomePublicPage } from "@/components/public/pages";
import { getSomePublicData } from "@/lib/public/server/some-page";

export const revalidate = 3600;

export async function generateMetadata() {
  const data = await getSomePublicData();
  return buildPageMetadata({ title: data.title, path: "/some-page" });
}

export default async function Page() {
  const data = await getSomePublicData();
  return <SomePublicPage data={data} />;
}
```

Minimal section pattern:

```tsx
import { publicTypography } from "@/components/public/primitives";

type EditorialSectionProps = {
  title: string;
  description?: string;
};

export function EditorialSection({ title, description }: EditorialSectionProps) {
  return (
    <section>
      <h2 className={publicTypography.sectionTitle}>{title}</h2>
      {description ? <p className={publicTypography.body}>{description}</p> : null}
    </section>
  );
}
```

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

Editorial image semantics:

- Blob stores the media asset; it is not the source of public accessibility text.
- Article image alt text is stored on `Article.imageAlt` because the same asset can have different editorial meaning in different contexts.
- Public renderers MUST resolve article image alt through `editorialImageAlt(article.imageAlt)` (`lib/public/format/image.ts`), the single point that encodes the policy. **Declared policy (A11Y-6):** an editorial image without `imageAlt` is intentionally decorative → `alt=""`; the meaning is already carried by the adjacent heading. This is a deliberate choice, not a missing description.
- SEO metadata and structured data may reuse `imageAlt` when an article image is selected.

## Runtime Invariants

- Single environment for now: one production deployment and one production database, no staging split assumed.
- tRPC is the only application API surface.
- Redis-backed rate limiting is required in production.
- If Redis is missing or unavailable in production, rate-limited CMS writes fail closed.
- Local development and tests may fall back to in-memory rate-limit counters.
- Resource deletion is hard delete.
- `Article.slug` is globally unique and normalized before persistence to support canonical `/articoli/:slug` URLs.
- `publishedAt` must only be set when an article status is `PUBLISHED`.
- `contentRich` and `audioChunks` should remain backward-compatible versioned payloads.

## Issue Home Regia

- Public home composition is issue-centric. `Issue.homeBlocks` is the editorial source of truth for the current issue home layout.
- Articles remain content entities with category, tags, author, media, and publication metadata. They do not own home placement state.
- `Issue.homeBlocks` is a validated JSON array. Each block stores `id`, `type`, optional `title`, optional `description`, `articleIds`, and optional `featuredArticleId`.
- Blocks use only manually assigned articles. Empty blocks are allowed in CMS state and are skipped by the public renderer.
- Supported block types are `opening`, `body`, `rupture`, and `closing`.
- `body` blocks can set `featuredPlacement` to `left` or `right`; `right` also makes the featured article last in that block's numbering order.
- One article can be assigned to one home block only. The server schema rejects duplicate article assignments across blocks.
- `opening`, `rupture`, and `closing` are single-article blocks.
- `opening` and `rupture` cannot include block title or description. Their article is the editorial payload.
- `closing` can include title and description while still allowing only one article.
- The public renderer composes `NarrativeHomeBlock` objects from `Issue.homeBlocks`. If no valid blocks exist, it falls back to issue article order with an `opening` block followed by a `body` block.
- Shared helper rules for editing and layout generation live in `lib/issues/home-block-rules.ts`. Server validation remains in `lib/server/modules/issues/schema/index.ts`; keep both aligned when block rules change.

## Decision Boundaries

- Put business rules in `service`.
- Put database access in `repository`.
- Keep routers and App Router pages orchestration-only.
- Keep shared CMS UI in `components/cms` and domain-specific composition in `features/cms`.
- Keep shared public UI in `components/public`, separated by primitive/compound/section/page responsibility.
- Prefer extending existing shared helpers over duplicating list/query/error logic per resource.

## Related Docs

- `README.md`: operational setup and API baseline.
- `AGENTS.md`: repo-specific engineering rules.
- `docs/cms-ui.md`: CMS visual system and component governance.
