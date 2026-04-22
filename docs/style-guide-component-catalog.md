# Style Guide Component Catalog

Source: `docs/Middleware Style Guide.html`

Purpose: canonical inventory for deep UI refactor, with one-by-one parity tracking.

## A) Layout residual

Token fondazionali (palette, alpha, filetti, spacing, type scale, griglie) gia allineati in `app/globals.css` — vedi `docs/cms-ui.md` (sezione _Foundation freeze_).

Componenti visivi ancora da realizzare:

1. Masthead/header editoriale
2. Footer signature block

## E) Remaining from tags/badges/buttons/feedback

1. Full form example (subscription form) — composition task (all primitives already parity_done)

## F) Voice and tone content blocks (SG sezione 10)

1. Voice & Tone rule grid (registro/titoli/occhielli/metadati/categorie/bilingue)

## Mapping notes (initial)

- Existing CMS primitives to evolve: `components/cms/primitives/*`
- Composite domain blocks: `features/cms/*/screens/*` and `components/cms/common/*`
- Editorial/public-site primitives: `components/editorial/*`

## Refactor rule

- Implement parity one component-group at a time.
- Each component moves: `not_started` -> `in_progress` -> `parity_done`.
- No batch "visual approximation": each item needs explicit state parity.
