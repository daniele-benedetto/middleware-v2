# CMS UI Audit vs Style Guide (Task 2.6)

Date: 2026-04-22

Reference:

- `docs/Middleware Style Guide.html`
- `docs/cms-ui.md`

Scope:

- CMS routes and components under `app/(cms)`, `components/cms`, `features/cms`, and shared UI primitives currently used by CMS.

## 1) Executive outcome

Overall status: **partially aligned**.

- Visual direction, typography families, border language, and light-only baseline are aligned.
- Main gap: CMS components still rely heavily on hardcoded color values (`#...`) instead of semantic tokens.
- Secondary gaps: form state parity with style guide and interaction-state consistency are incomplete.

## 2) Area-by-area assessment

### Palette and tokens

Status: **Medium gap**

What aligns:

- Global palette tokens and semantic tokens are present in `app/globals.css`.
- Core colors match style guide (`crema`, `nero`, `rosso`, `bianco`).

What is missing:

- CMS components use many hardcoded hex values instead of tokens.
- Repeated values appear across layout/common/primitives and feature screens.

Evidence (examples):

- `components/cms/layout/sidebar.tsx`
- `components/cms/common/confirm-dialog.tsx`
- `components/cms/primitives/data-table-shell.tsx`
- `features/cms/dashboard/screens/dashboard-screen.tsx`

Recommendation:

- Migrate component classes to semantic tokens (`bg-background`, `text-foreground`, `border-border`, `text-accent`, etc.) with utility aliases where needed.

### Typography

Status: **Good alignment**

What aligns:

- `Archivo Black`, `Newsreader`, `IBM Plex Mono` are wired and used through `.font-display`, `.font-editorial`, `.font-ui`.
- Hierarchy generally follows guide sizes for labels/headings/body.

Residual gap:

- Some body and helper text sizes are repeated ad hoc instead of consistently mapped to tokenized scale classes.

### Spacing and borders

Status: **Good alignment with minor drift risk**

What aligns:

- Spacing scale exists in tokens and most CMS blocks use corresponding values (`p-4`, `p-6`, etc.).
- Border language (1px/3px) and square surfaces are coherent.

Residual gap:

- Border/color classes are often literal; tokenized line utilities are not consistently used.

### Form states (default/focus/error/disabled)

Status: **Medium gap**

What aligns:

- Inputs and buttons expose focus and invalid variants via shared UI primitives.
- Global focus-visible is defined.

What is missing:

- CMS-specific form contract parity from style guide is not fully codified (default/focus/filled/error/disabled patterns not standardized in one domain layer yet).
- Select/checkbox/radio visual behavior is available in primitives but not yet governed by CMS-specific variants.

### Component parity (card, CTA, cover, empty/loading/error)

Status: **Medium gap**

What aligns:

- Empty/loading/forbidden and listing shells exist and are coherent with editorial look.

What is missing:

- Full parity for style-guide component states is incomplete (especially richer CTA/cover variants and per-state consistency rules).

### Responsive/grid rules

Status: **Good alignment**

What aligns:

- Grid tokens and mobile collapse are present in global CSS.
- CMS shell and list components include mobile fallbacks.

## 3) Additional checks requested (beyond style guide)

### Accessibility

Status: **Partially aligned**

- Positive: global focus-visible, semantic structure, and keyboard-safe primitives.
- Gap: needs explicit per-page a11y verification checklist execution (focus order, labels, aria details, contrast checks).

### Interaction states consistency

Status: **Partial**

- Hover/focus patterns exist but are not yet centralized per CMS variant set.

### i18n consistency

Status: **Mostly aligned**

- CMS copy is mostly centralized in `lib/i18n/*`.
- Follow-up: continue enforcing no hardcoded user-facing copy during CRUD rollout.

### Performance

Status: **Good baseline**

- Route files are thin; client boundaries are generally minimal.
- Follow-up: avoid unnecessary client components while adding data hooks.

### Quality gates

Status: **Aligned**

- PR checklist and mandatory `lint/typecheck/build` are in place.
- CMS smoke checklist now exists in `docs/cms-smoke-checklist.md`.

## 4) Severity-ranked gap list

High:

1. Token adoption incomplete due to widespread hardcoded hex in CMS components.

Medium:

2. CMS form state system not fully standardized against style-guide state matrix.
3. Interaction-state patterns not yet centralized as CMS variants/utilities.
4. Component parity with style-guide advanced blocks (CTA/cover variants) incomplete.

Low:

5. Typography/spacing still partly class-literal instead of strict token utilities.

## 5) Implementation milestones (UI)

### Milestone U1 - Token hardening (quick wins)

1. Replace hardcoded palette values in `components/cms/*` and `features/cms/*` with semantic token classes.
2. Add small CMS utility class map for repeated patterns (surface, heading, meta label, section border).
3. Verify no visual regression on desktop/tablet/mobile.

### Milestone U2 - Form and interaction normalization

1. Define CMS form variants on top of shared primitives (input/select/textarea/button).
2. Standardize hover/focus/active/disabled/loading states across list, dialog, and toolbar actions.
3. Add explicit invalid/error visual contract to CMS form field wrappers.

### Milestone U3 - Component parity and governance

1. Introduce reusable CMS variants for card/CTA patterns used in editorial pages.
2. Add UI review checklist section to PR workflow for state and responsiveness parity.
3. Keep `docs/cms-ui.md` synced with implemented variants.

## 6) Deliverables completed in task 2.6

- Full UI gap analysis completed.
- Additional checks documented with current status.
- Severity backlog and milestone plan produced.
