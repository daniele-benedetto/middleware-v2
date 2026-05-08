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

- Display: `--text-display-hero` (clamp 48–96), `--text-display-h1` (clamp 28–48), `--text-display-h2` (clamp 18–28), `--text-display-h3`(clamp 16 28) `--text-display-quote` (clamp 20–32), `--text-display-label` (15)
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
- CMS list toolbar on mobile: keep search always visible, move secondary filters and sort controls into a right-side `Sheet` with explicit `Applica` and `Pulisci` actions. Desktop keeps filters inline.

## Motion and accessibility

- Motion tokens: `--motion-fast`, `--motion-base`, `--motion-slow`, `--easing-standard`
- Standard timings: `120ms`, `180ms`, `260ms`
- Reduced motion respected via `prefers-reduced-motion`.
- Focus visible treatment per component type (both mandatory):
  - Text input / textarea / select trigger: **border swap** — default `border 1px ink` → focus `border 2px accent`, `outline: none`. No outer ring.
  - Bottoni, link, accordion, dialog trigger, checkbox, radio, toggle, generic focusable: **outer outline** — `outline: 3px solid accent` con `outline-offset: 2px`.
- Global rule `*:focus-visible` in `app/globals.css` è in `@layer base` così le utility `outline-none` delle primitive shadcn (usate da input/textarea/select) vincono e non si ha doppio focus.
- Dark mode: **non supportato**. Nessuna utility `dark:*` nei componenti CMS; `color-scheme: light` forzato in `:root`.
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

**Do not render raw shadcn primitives directly in CMS modules.** The following primitives MUST pass through their CMS wrapper:

- `<Input>` → `CmsTextInput` (wrapped by `CmsFormField`)
- `<Textarea>` → `CmsTextarea` (wrapped by `CmsFormField`)
- `<Select*>` → `CmsSelect`
- `<Checkbox>` → `CmsCheckbox`
- `<RadioGroup*>` → `CmsRadio`
- `<Switch>` → `CmsToggle`
- `<Button>` → `CmsActionButton`
- `<Badge>` → `CmsBadge`

Reason: shadcn defaults (`bg-transparent`, `border-input` = ink-30, `rounded-lg`) deviano dalla SG. I wrapper CMS garantiscono parity (bg bianco, border ink pieno, radius 0, stati default/focus/filled/error/disabled) e centralizzano eventuali fix futuri.

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

Typography / surface:

- `CmsEyebrow`: mono uppercase UI labels (breadcrumbs, table headers, badges, section labels)
- `CmsHeading`: display and section headings (`size=page|section`)
- `CmsBody` / `CmsBodyText`: editorial/body text (`size=md|lg`, `tone=foreground|muted|accent`)
- `CmsDisplay`: display typography (`size=hero|h1|h2|quote|label`, `tone=foreground|accent|onAccent`)
- `CmsMetaText`: meta labels (`variant=category|tiny|number|paragraph`)
- `CmsBlockquote` / `CmsEpigraph` / `CmsHairline` / `CmsNote` / `CmsParagraphNumber` / `CmsSectionNumber`: editorial variants per SG sezione tipografica
- `CmsSurface`: panel surface (`border=default|strong`, `spacing=none|md|lg|xl`)
- `CmsSectionDivider`: separator line (`tone=strong|grid|accent|dashed`)
- `CmsPageHeader`: page title + subtitle + actions + strong divider

Actions:

- `CmsActionButton`: primary | primary-accent | outline | outline-accent | ghost | ghost-accent, sizes `xs|md|lg|full`. Legacy `tone=primary|secondary|danger` mantenuto per backcompat.

Form controls (always wrap in `CmsFormField`):

- `CmsFormField`: unico wrapper consentito. Gestisce label, hint, error state con prefisso `⚑` (U+2691) e testo `IBM Plex Mono 10px accent`.
- `CmsFormLabel`: label mono 10px (`state=default|focus|filled|error|disabled`)
- `CmsTextInput`: text input (`tone=editorial|ui|mono`, `state` auto se `disabled`). Default/filled bianco, focus bordo 2px accent, error bg `--ui-error-bg`.
- `CmsTextarea`: textarea editorial, supporta `showCounter` + `maxLength`.
- `CmsSelect`: dropdown con opzioni `{value,label}[]`, placeholder default `— SELEZIONA —`.
- `CmsCheckbox` / `CmsRadio`: 20×20 ink, checked crema checkmark; variante `accent=true` per bg/bordo rosso.
- `CmsToggle`: switch on/off, variante `accent` per tracciato rosso.

Feedback / overlay:

- `CmsBadge`: `category-outline-{accent|ink}`, `category-solid-{accent|ink}`, `status-{new|draft|published|archived}`
- `CmsRemovableTag`: tag con `×` per selector multi-tag.
- `CmsBreakingDot`: pallino rosso + label accent uppercase.
- `CmsTooltip`: variante `short-dark` (bg ink, mono 10px) o `long-accent` (bg rosso, editorial italic 13px). Trigger = termine inline con underline-dashed-accent.
- `cmsToast.{info|breaking|error}(body, label?)`: toast persistente SG-compliant. Richiede `<Toaster />` montato (già in `app/layout.tsx`).
- `CmsConfirmDialog` (in `components/cms/common`): modale conferma hard-delete, header ink, corpo editorial 15px, footer opzionale.

Data / navigation:

- `CmsDataTableShell` + `cmsTableClasses`: wrap shadcn `Table` con parity SG sezione 08.
  - Default table: `headerRow` (bg ink, border 2px), `headerCell` (mono 10px crema, divisori cream/15)
  - Sortable: `sortableHeaderRow` (bg crema-dk) + `sortableHeaderCell` + `sortableHeaderCellActive` (testo accent) + icona `<CmsSortIcon direction="asc|desc|null" />`
  - Body: `bodyRow` (alt bianco/crema-dk, hover bg accent + testo bianco), `bodyRowArchived` (bg crema-dk)
  - Cells: `bodyCellTitle` (Newsreader 15), `bodyCellMeta` (mono 11 ink-60), `bodyCellNumeric` (right-aligned mono), `bodyCellBadge` (host per `CmsBadge variant="status-*"`), variante `*Archived` con testo ink-30 italic
- `CmsPagination`: numerata zero-pad, bordo accent sull'attivo, `← PREC.` / `SUCC. →`, ellipsis `…`.
- `CmsStepper`: dot size-3 per step, connettori accent/grigio.
- `CmsSearchBar` + `CmsSearchResultItem`: barra ricerca con icona, stato `active` (bordo accent).
- `CmsLayoutShell`: shell sidebar + topbar + content del CMS.
- `CmsMetaRow`: coppia label/valore in `CmsEyebrow` mono.
- `CmsEditorialCard`: card editoriale con CTA per dashboard/link.

Stati pagina (in `components/cms/common`):

- `CmsLoadingState`: skeleton 4 blocchi border/bg.
- `CmsEmptyState`: surface con eyebrow + title + body + CTA opzionale.
- `CmsErrorState`: surface con eyebrow "ERRORE" + title + body + `outline-accent` retry button opzionale.
- `CmsForbiddenState`: 403 con title + body editoriale.

Rule:

- Prefer these primitives over repeating inline typography/surface/action classes.
- Ogni pagina lista CMS deve coprire tutti gli stati: loading → empty → data → error → forbidden.

## UI done checklist (per page)

- loading state
- empty state
- error state
- success feedback
- keyboard accessibility
- responsive behavior

## Foundation freeze

Tokens fondazionali (palette, alpha, filetti, spacing, type scale, line-heights, griglie) sono documentati qui e implementati in `app/globals.css` e nelle primitives CMS. Aggiungere nuovi token solo quando servono davvero e mantenerli coerenti tra documentazione e implementazione.

## Source of truth

- Canonical document: `docs/cms-ui.md`
- Summary and onboarding context: `README.md`
- CMS guard/permission smoke checklist: `docs/cms-smoke-checklist.md`
