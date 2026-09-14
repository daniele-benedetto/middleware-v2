# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Public visitors are the current product focus. Their specific audience segments and priority reading tasks remain undecided.

## Product Purpose

An Italian-language editorial publication delivered through public web routes. Its public content includes issue-led dossiers, articles, courses, and audio experiences.

## Positioning

Open decision: the publication's audience promise and editorial differentiation need confirmation.

## Operating Context

Visitors use public routes to read editorial content and access courses and audio. An internal CMS supports editorial publication, but it is outside the current product-work scope.

## Capabilities and Constraints

- Public route work is the present priority.
- Public-facing content is Italian only.
- The existing Next.js App Router application uses Prisma/Postgres, Better Auth, S3-compatible media storage, and Redis-backed production rate limiting.
- Public routes render CMS-authored editorial content without shipping the CMS editor.

## Evidence on Hand

- Existing public route and component implementation under `app/(public)` and `components/public`.
- Editorial, course, audio, and issue data models in the application source.
- No independent audience research, testimonials, customer claims, or publication positioning materials have been confirmed; do not fabricate them.

## Product Principles

- Prioritize a clear, coherent public reading experience.
- Preserve Italian as the public language.
- Let editorial content and its real structure guide public-route work.
- Keep CMS administration distinct from the public visitor experience.
