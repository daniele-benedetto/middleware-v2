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

## E) Remaining from tags/badges/buttons/feedback

1. Full form example (subscription form) — composition task (all primitives already parity_done)

## F) Voice and tone content blocks

1. Voice & Tone rule grid (registro/titoli/occhielli/metadati/categorie/bilingue)

## Mapping notes (initial)

- Existing CMS primitives to evolve: `components/cms/primitives/*`
- Composite domain blocks: `features/cms/*/screens/*` and `components/cms/common/*`

## Refactor rule

- Implement parity one component-group at a time.
- Each component moves: `not_started` -> `in_progress` -> `parity_done`.
- No batch "visual approximation": each item needs explicit state parity.
