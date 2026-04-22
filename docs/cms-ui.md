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

- `--ink-70`: `rgba(10,10,10,0.7)` (hairline/occhiello)
- `--ink-60`: `rgba(10,10,10,0.6)` (testo secondario)
- `--ink-50`: `rgba(10,10,10,0.5)` (metadati, numeri paragrafo)
- `--ink-30`: `rgba(10,10,10,0.3)` (filetti, placeholder, disabled)

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

Type scale (base):

- `--text-xs` (11), `--text-sm` (14), `--text-ml` (15), `--text-md` (16), `--text-lg` (19), `--text-xl` (24), `--text-2xl` (36)

Editorial type scale (SG parity):

- Display: `--text-display-hero` (clamp 48–96), `--text-display-h1` (clamp 28–48), `--text-display-h2` (clamp 18–28), `--text-display-quote` (clamp 20–32), `--text-display-label` (15)
- Editorial: `--text-editorial-body` (19), `--text-editorial-epigraph` (16), `--text-editorial-blockquote` (17), `--text-editorial-hairline` (15), `--text-editorial-note` (14)
- Meta: `--text-meta` (11), `--text-section-number` (12)

Line-heights:

- base: `--lh-xs` (1.4), `--lh-sm` (1.5), `--lh-md` (1.55), `--lh-lg` (1.67), `--lh-xl` (1.08), `--lh-2xl` (0.9)
- editorial (SG): `--lh-display-h1` (1.05), `--lh-display-quote` (1.2), `--lh-editorial` (1.6)

Weights: `--fw-regular`, `--fw-medium`, `--fw-semibold`

## Surfaces and separators

- Border radius: `0`
- Shadows: `none`
- Main separator: `--line-strong` (`3px` ink)
- Internal grid line: `--line-grid` (`1px` ink)
- Semantic accent line: `--line-accent` (`4px` accent, blockquote)
- Menu accent line: `--line-menu-accent` (`4px` accent, bordo sinistro menu attivo)
- Reading bar: `--line-reading` (`3px` accent)
- Dashed separator: `--line-dashed` (`1px dashed` ink-30, slot vuoti archivio)

## Spacing and grid

Spacing scale: `4, 8, 12, 16, 20, 24, 32, 48, 72`

Grid primitives:

- home: `--grid-home-left` + `--grid-home-right`
- listing: `--grid-listing-equal`, `--grid-listing-asym`
- article body: `--grid-article-number`, `--grid-article-gap`, `--grid-article-content`
- filters: `--grid-filters`
- covers: `--grid-covers`
- article max width: `--article-max-width` + padding `--article-padding-y` / `--article-padding-x`

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

### Primitive usage map

- `CmsEyebrow`: mono uppercase UI labels (breadcrumbs, table headers, badges, section labels)
- `CmsHeading`: display and section headings (`size=page|section`)
- `CmsBodyText`: editorial/body text (`size=md|lg`, `tone=foreground|muted|accent`)
- `CmsSurface`: reusable panel surface (`border=default|strong`, `spacing=none|md|lg`)
- `CmsActionButton`: standard CMS action states and tones (`primary|secondary|danger`)
- `CmsDataTableShell` + `cmsTableClasses`: wrap shadcn `Table` con parity SG sezione 08
  - Default table: `headerRow` (bg ink, border 2px), `headerCell` (mono 10px crema, divisori cream/15)
  - Sortable: `sortableHeaderRow` (bg crema-dk) + `sortableHeaderCell` + `sortableHeaderCellActive` (testo accent) + icona `<CmsSortIcon direction="asc|desc|null" />`
  - Body: `bodyRow` (alt bianco/crema-dk, hover bg accent + testo bianco), `bodyRowArchived` (bg crema-dk)
  - Cells: `bodyCellTitle` (Newsreader 15), `bodyCellMeta` (mono 11 ink-60), `bodyCellNumeric` (right-aligned mono), `bodyCellBadge` (host per `CmsBadge variant="status-*"`), variante `*Archived` con testo ink-30 italic

Rule:

- Prefer these primitives over repeating inline typography/surface/action classes.

## UI done checklist (per page)

- loading state
- empty state
- error state
- success feedback
- keyboard accessibility
- responsive behavior

## Foundation freeze

Tokens fondazionali (palette, alpha, filetti, spacing, type scale, line-heights, griglie) allineati a `docs/Middleware Style Guide.html`. Aggiungere nuovi token solo dietro riferimento esplicito nella style guide. Per valori non tokenizzati preferire Tailwind arbitrary values locali al componente.

## Source of truth

- Canonical document: `docs/cms-ui.md`
- Summary and onboarding context: `README.md`
- CMS architecture audit and milestones: `docs/cms-architecture-audit.md`
- CMS UI audit and milestones: `docs/cms-ui-audit.md`
- CMS guard/permission smoke checklist: `docs/cms-smoke-checklist.md`
