# Style Guide Component Catalog

Source: `docs/Middleware Style Guide.html`

Purpose: canonical inventory for deep UI refactor, with one-by-one parity tracking.

## A) Foundations and layout

1. Masthead/header editoriale
2. Palette swatches (main)
3. Alpha variants display
4. Spacing scale display
5. Borders/filetti system (thin/strong/accent/dashed)
6. Grid recipes (home/list/article/filters/covers/max width)
7. Footer signature block

## B) Typography specimens

1. Archivo Black display set (hero/h1/h2/pull quote/section label)
2. Newsreader editorial set (body/epigraph/blockquote/hairline/footnote)
3. IBM Plex Mono meta set (category/meta/tagline/paragraph-number/section-number)

## C) Editorial blocks

1. Article Card (default + hover)
2. Cover Story Block (accent + neutral)
3. CTA styles (primary/outline/text/link-inline)
4. Manifesto block
5. Audio player
6. Cover System (6 variants + rules)

## D) Form and controls

1. Text Input: default
2. Text Input: focus
3. Text Input: filled
4. Text Input: error
5. Text Input: disabled
6. Textarea
7. Select: default
8. Select: selected
9. Select: dropdown open
10. Checkbox: unchecked
11. Checkbox: checked
12. Checkbox: checked accent
13. Checkbox: disabled
14. Radio: unchecked
15. Radio: checked
16. Radio: disabled
17. Toggle: off
18. Toggle: on (ink)
19. Toggle: on (accent)

## E) Tags, badges, buttons, feedback

1. Category badges set
2. Removable filter tags
3. Status/notification badges
4. Buttons: primary set
5. Buttons: secondary/outline set
6. Buttons: ghost/text set
7. Buttons: size set (xs/md/lg/full-width)
8. Search bar: default
9. Search bar: with results
10. Full form example (subscription form)
11. Pagination strip
12. Stepper strip
13. Toast: info
14. Toast: breaking
15. Toast: error/dark
16. Tooltip: short/dark
17. Tooltip: long/accent

## F) Voice and tone content blocks

1. Voice & Tone rule grid (registro/titoli/occhielli/metadati/categorie/bilingue)

## Mapping notes (initial)

- Existing CMS primitives to evolve: `components/cms/primitives/*`
- Form/control base: `lib/cms/ui/variants.ts` + new dedicated control primitives
- Composite domain blocks: `features/cms/*/screens/*` and `components/cms/common/*`

## Refactor rule

- Implement parity one component-group at a time.
- Each component moves: `not_started` -> `in_progress` -> `parity_done`.
- No batch "visual approximation": each item needs explicit state parity.

## Implementation matrix (current)

- Text Input (5 states): `parity_done` via `components/cms/primitives/form-controls.tsx`
- Textarea: `in_progress` via `components/cms/primitives/form-controls.tsx`
- Select/Dropdown: `in_progress` via `components/cms/primitives/form-controls.tsx`
- Checkbox/Radio/Toggle: `in_progress` via `components/cms/primitives/form-controls.tsx`
- Form error/hint harmonization: `in_progress` via `components/cms/primitives/form-field.tsx`
