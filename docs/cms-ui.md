# CMS UI Style Guide

## Visual direction

- Editorial, strict, high contrast.
- No decorative effects.
- Every element must carry information or action value.

## Core palette

- `--bg-main`: `#F0E8D8`
- `--bg-hover`: `#E5D9C5`
- `--ink`: `#0A0A0A`
- `--accent`: `#C8001A`
- `--white`: `#FFFFFF`

Approved alpha variants:

- `--ink-60`: `rgba(10,10,10,0.6)`
- `--ink-50`: `rgba(10,10,10,0.5)`
- `--ink-30`: `rgba(10,10,10,0.3)`

## Semantic tokens

- `--ui-background`, `--ui-foreground`, `--ui-muted`, `--ui-border`, `--ui-ring`
- `--ui-primary`, `--ui-secondary`, `--ui-accent`, `--ui-destructive`, `--ui-success`, `--ui-warning`
- row states: `--ui-row-hover`, `--ui-row-selected`, `--ui-disabled`

CMS feedback visuals are allowed and standardized:

- `--ui-success`: `#1B7F3A`
- `--ui-warning`: `#B26A00`
- `--ui-destructive`: `#C8001A`

## Typography roles

- Display/headings: `Archivo Black` (uppercase)
- Editorial long text: `Newsreader`
- UI/meta/labels: `IBM Plex Mono`

Type scale and line-height tokens:

- `--text-xs`, `--text-sm`, `--text-md`, `--text-lg`, `--text-xl`, `--text-2xl`
- `--lh-xs`, `--lh-sm`, `--lh-md`, `--lh-lg`, `--lh-xl`, `--lh-2xl`
- weights: `--fw-regular`, `--fw-medium`, `--fw-semibold`

## Surfaces and separators

- Border radius: `0`
- Shadows: `none`
- Main separator: `--line-strong` (`3px` ink)
- Internal grid line: `--line-grid` (`1px` ink)
- Semantic accent line: `--line-accent` (`4px` accent)
- Reading bar: `--line-reading` (`3px` accent)

## Spacing and grid

Spacing scale: `4, 8, 12, 16, 20, 24, 32, 48, 72`

Grid primitives:

- home: `--grid-home-left` + `--grid-home-right`
- listing: `--grid-listing-equal`, `--grid-listing-asym`
- article body: `--grid-article-number`, `--grid-article-gap`, `--grid-article-content`
- filters: `--grid-filters`
- covers: `--grid-covers`
- article max width: `--article-max-width`

Responsive rule:

- under `768px`: single-column collapse, covers in 2 columns.

## Motion and accessibility

- Motion tokens: `--motion-fast`, `--motion-base`, `--motion-slow`, `--easing-standard`
- Standard timings: `120ms`, `180ms`, `260ms`
- Reduced motion respected via `prefers-reduced-motion`.
- Focus visible ring is mandatory (`3px` accent).
- Text selection: accent background + white text.
- Accessibility target: WCAG AA minimum.

## Components governance

Folder ownership:

- `components/ui`: shadcn-managed primitives
- `components/cms`: domain compositions

Mandatory rule:

- Before writing a custom component, check `shadcn/ui` availability first.
- Default stance: use `shadcn/ui` primitives as first choice.

Custom component allowed only when:

- no equivalent exists in shadcn/ui, or
- domain behavior cannot be achieved by composition cleanly.

PR requirement:

- explain why custom was needed instead of a shadcn primitive.
- checklist is enforced via `.github/pull_request_template.md`.

## Icon set

- Standard icon set: `lucide-react`
- Naming rule: `Noun[Action]Icon` in local wrappers when semantic alias helps readability.

## Shared component contract

- Common props vocabulary: `variant`, `size`, `state`
- Form contract: field wrapper + label + help text + error message + submit state
- Table contract: toolbar + filters + sortable headers + row actions + pagination footer

## UI done checklist (per page)

- loading state
- empty state
- error state
- success feedback
- keyboard accessibility
- responsive behavior

## Source of truth

- Canonical document: `docs/cms-ui.md`
- Summary and onboarding context: `README.md`
