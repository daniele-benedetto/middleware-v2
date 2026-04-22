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

## H) Tabella (SG sezione 08)

1. Tabella dati default (header bg nero + testo crema, righe alternate bianco/crema-dk, stato badge integrati, riga archiviata testo ink-30 italic)
2. Tabella — header ordinabile + riga hover (freccia ↕ ink-30 / ↓ accent attiva, hover riga bg accent + testo bianco)

## I) Overlay & Accordion (SG sezione 09)

1. Modal/Dialog (overlay `rgba(10,10,10,0.45)`, bordo 2px nero, header bg nero + `×` bianco, CTA primaria accent, footer info mono 10px ink-60)
2. Accordion — item aperto (header bg nero + testo bianco + `−` bianco/60)
3. Accordion — item chiuso (header bg crema + `+` ink-30)
4. Accordion numerazione sezione mono rosso (I. II. III. …)

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
