# Public Performance TODO

Scope: `app/(public)` and the public components/loaders it depends on. Priorities are ordered by expected impact on origin load, TTFB, Flight payload, and client responsiveness.

## P0 - Cache and request deduplication

- [x] Add `'use cache'`, an explicit `cacheLife`, and the existing `cacheTag` values to stable public read loaders in `lib/public/server/*`.
- [x] Keep request-dependent values outside cached functions; cache granular resources by slug and independent archive/navigation loaders separately.
- [x] Cover home, articles, issues, courses, lessons, static pages, navigation, legal-consent version, sitemap, and listen-page metadata.
- [x] Verify CMS mutations invalidate every affected cache tag through `lib/public/server/revalidation.ts`.
- [ ] Confirm a repeated public request no longer executes database/service reads while its cache entry is valid.

- [x] Deduplicate loaders shared by `generateMetadata` and route rendering.
- [x] Use the cached public loaders as the primary deduplication mechanism.
- [x] Use `React.cache()` only for request-scoped loaders that must remain uncached.
- [x] Verify one request to each dynamic route performs its underlying resource lookup once.

## P1 - Data access and streaming

- [x] Replace `getPublishedCourseDetails` in `lib/public/server/course-page.ts` with one archive-specific query/projection.
- [x] Return only fields required by course archive cards, including any required cover data and lesson count.
- [x] Remove the per-course `getBySlug` fan-out and introduce explicit pagination or a deliberate display limit.
- [x] Verify the course index and course detail do not issue N+1 reads.

- [x] Parallelize independent listen-page work after resolving the article or lesson.
- [x] In lesson listen pages, load course numbering and transcript chunks concurrently.
- [x] Move large transcript resolution behind a nested `Suspense` boundary or an on-demand client request so the playback shell can render first.
- [ ] Measure TTFB and Flight payload for a representative long article and lesson transcript before and after the change.

## P1 - Audio player scalability

- [x] Replace the unbounded transcript rendered by `getVisibleAudioChunks` with a bounded window around the active chunk or a virtualized list.
- [x] Preserve accessible transcript navigation and provide an explicit way to reveal additional transcript content if needed.
- [x] Index chunks for active-chunk lookup instead of linear searches on each playback update.
- [x] Coalesce transcript visual state updates to animation frames or a lower display frequency while retaining audio timing in refs.
- [ ] Test long transcripts for smooth playback, bounded DOM size, seeking, bookmarks, keyboard navigation, and reduced-motion behavior.

## P2 - Shared shell and client bundle

- [ ] Cache and share `getPublicNavigation` between header and footer slots.
- [ ] Cache and share `getLegalConsentVersion` between cookie consent and analytics slots.
- [ ] Verify header/footer/consent streaming behavior remains unchanged when cached data is unavailable.

- [ ] Replace per-instance `TrackedPublicLink` client boundaries with server-rendered links carrying analytics `data-*` attributes.
- [ ] Add one delegated client click listener at the public shell level.
- [ ] Preserve modifier-click behavior and do not track cancelled/default-prevented navigations.
- [ ] Compare client bundle and hydration cost on article, issue, and course archives.

- [ ] Defer Leaflet map mount with `IntersectionObserver` and a viewport root margin.
- [ ] Keep a fixed-size placeholder to prevent layout shift before map initialization.
- [ ] Verify map initialization, markers, touch interaction, resize handling, and tile-error UI after deferred loading.

## Validation

- [x] Run `pnpm typecheck` and `pnpm lint` after each implementation group.
- [x] Run `pnpm test:run`.
- [x] Add targeted unit tests for the course archive projection.
- [x] Add targeted unit tests for transcript windowing.
- [ ] Add targeted unit tests for cache boundaries.
- [x] Run `pnpm build` after cache-related work to validate Next.js 16 Cache Components constraints.
- [ ] Capture production-like traces for cold and warm requests, including home, article, course archive, course detail, and both listen routes.
- [ ] Track TTFB, database/service call count, Flight payload size, client JS, LCP, INP, and transcript DOM node count as acceptance metrics.
